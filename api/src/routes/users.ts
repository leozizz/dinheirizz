import { Hono } from 'hono'
import { eq, or, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { syncUserSchema } from '../schemas/auth'
import type { AuthEnv } from '../middlewares/auth'

export const usersRouter = new Hono<AuthEnv>()

// Armazenamento em memória para ambiente de testes e execução offline quando DB não está conectado
interface UserRecord {
  id: string
  email: string
  fullName: string | null
  username: string | null
  avatarUrl: string | null
  provider: string
  providers: string[]
  createdAt: string | Date
  updatedAt?: string | Date | null
}

const mockUsersStore = new Map<string, UserRecord>()

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName ?? null,
    username: user.username ?? null,
    avatarUrl: user.avatarUrl ?? null,
    provider: user.provider ?? 'email',
    providers: user.providers ?? [user.provider ?? 'email'],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt ?? null
  }
}

// GET /api/v1/users/check-email?email=...
// Endpoint público para verificação prévia impedindo cadastros duplicados (em public.users e auth.users)
usersRouter.get('/check-email', async (c) => {
  const emailParam = c.req.query('email')
  if (!emailParam) {
    return c.json({ error: 'E-mail é obrigatório' }, 400)
  }
  const email = emailParam.trim().toLowerCase()
  const db = getDb()

  if (!db) {
    const exists = Array.from(mockUsersStore.values()).some((u) => u.email.toLowerCase() === email)
    return c.json({ exists })
  }

  try {
    // 1. Verifica na tabela da aplicação (public.users)
    const records = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (records.length > 0) {
      return c.json({ exists: true })
    }

    // 2. Verifica na tabela interna do Supabase (auth.users), cobrindo usuários pendentes
    const authRecords = await db
      .execute(sql`SELECT id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`)
      .catch(() => [])

    return c.json({ exists: authRecords.length > 0 })
  } catch {
    return c.json({ exists: false })
  }
})

// GET /api/v1/users/me
usersRouter.get('/me', async (c) => {
  const userId = c.get('userId')
  const authUser = c.get('user')
  const email = (authUser?.email as string) || ''

  const db = getDb()

  if (!db) {
    // Busca do armazenamento de mock em testes
    let user = mockUsersStore.get(userId)
    if (!user && email) {
      user = Array.from(mockUsersStore.values()).find((u) => u.email === email)
    }

    if (!user) {
      // Usuário default derivado do token se ainda não sincronizado
      user = {
        id: userId,
        email: email || 'user@dinheirizz.com',
        fullName: null,
        username: null,
        avatarUrl: null,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      mockUsersStore.set(userId, user)
    }

    return c.json({ user: sanitizeUser(user) })
  }

  try {
    const records = await db
      .select()
      .from(users)
      .where(or(eq(users.id, userId), eq(users.email, email)))
      .limit(1)

    if (records.length > 0) {
      const u = records[0]
      return c.json({
        user: sanitizeUser({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          username: u.username,
          avatarUrl: u.avatarUrl,
          provider: u.provider || 'email',
          providers: u.providers || [u.provider || 'email'],
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        })
      })
    }

    return c.json(
      {
        user: sanitizeUser({
          id: userId,
          email,
          fullName: null,
          username: null,
          avatarUrl: null,
          provider: 'email',
          providers: ['email'],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    )
  } catch {
    return c.json({ error: 'Erro ao buscar perfil do usuário' }, 500)
  }
})

// POST /api/v1/users/sync
// Cria ou atualiza o perfil do usuário, unificando provedores (Account Linking) pelo e-mail
usersRouter.post('/sync', async (c) => {
  const userId = c.get('userId')
  const authUser = c.get('user')
  const email = ((authUser?.email as string) || '').toLowerCase()

  if (!email) {
    return c.json(
      { error: 'Não autorizado', message: 'E-mail ausente nas credenciais do usuário' },
      400
    )
  }

  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = syncUserSchema.safeParse(rawBody)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const data = parsed.data
  const incomingProvider = data.provider || 'email'
  const db = getDb()

  if (!db) {
    // Cenário de teste / offline: reconciliação de provedores (Account Linking) em memória
    let existingUser = Array.from(mockUsersStore.values()).find(
      (u) => u.email.toLowerCase() === email || u.id === userId
    )

    if (existingUser) {
      // Reconcilia conta existente com o novo provedor sem criar duplicatas
      const existingProviders = existingUser.providers || [existingUser.provider || 'email']
      const mergedProviders = Array.from(new Set([...existingProviders, incomingProvider]))

      existingUser.fullName = data.fullName || existingUser.fullName
      existingUser.username = data.username || existingUser.username
      existingUser.avatarUrl = data.avatarUrl || existingUser.avatarUrl
      existingUser.providers = mergedProviders
      existingUser.updatedAt = new Date().toISOString()

      mockUsersStore.set(existingUser.id, existingUser)
      return c.json({ user: sanitizeUser(existingUser) }, 200)
    }

    const newUser: UserRecord = {
      id: userId,
      email,
      fullName: data.fullName ?? null,
      username: data.username ?? null,
      avatarUrl: data.avatarUrl ?? null,
      provider: incomingProvider,
      providers: [incomingProvider],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockUsersStore.set(userId, newUser)
    return c.json({ user: sanitizeUser(newUser) }, 200)
  }

  try {
    // Busca usuário existente por email ou id
    const existingRecords = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.id, userId)))
      .limit(1)

    if (existingRecords.length > 0) {
      const existing = existingRecords[0]
      const currentProviders = existing.providers || [existing.provider || 'email']
      const mergedProviders = Array.from(new Set([...currentProviders, incomingProvider]))

      const updated = await db
        .update(users)
        .set({
          fullName: data.fullName || existing.fullName,
          username: data.username || existing.username,
          avatarUrl: data.avatarUrl || existing.avatarUrl,
          providers: mergedProviders,
          updatedAt: new Date()
        })
        .where(eq(users.id, existing.id))
        .returning()

      const u = updated[0]
      return c.json({
        user: sanitizeUser({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          username: u.username,
          avatarUrl: u.avatarUrl,
          provider: u.provider || 'email',
          providers: u.providers || [u.provider || 'email'],
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        })
      })
    }

    // Usuário novo
    const inserted = await db
      .insert(users)
      .values({
        id: userId,
        email,
        fullName: data.fullName ?? null,
        username: data.username ?? null,
        avatarUrl: data.avatarUrl ?? null,
        provider: incomingProvider,
        providers: [incomingProvider]
      })
      .returning()

    const u = inserted[0]
    return c.json({
      user: sanitizeUser({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        username: u.username,
        avatarUrl: u.avatarUrl,
        provider: u.provider || 'email',
        providers: u.providers || [u.provider || 'email'],
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      })
    })
  } catch (error) {
    return c.json({ error: 'Erro ao sincronizar usuário no banco' }, 500)
  }
})
