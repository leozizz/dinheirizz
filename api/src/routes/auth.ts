import { Hono } from 'hono'
import { eq, or, sql } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { signupSchema, loginSchema } from '../schemas/auth'
import type { AuthEnv } from '../middlewares/auth'

export const authRouter = new Hono<AuthEnv>()

// Armazenamento em memória para testes unitários e modo offline
interface LocalAuthUser {
  id: string
  email: string
  passwordHash?: string
  fullName: string | null
  username: string | null
  provider: string
  providers: string[]
  createdAt: string | Date
  updatedAt?: string | Date | null
}

const mockAuthStore = new Map<string, LocalAuthUser>()

function getJwtSecret(c: any): string {
  return (
    c.env?.JWT_SECRET ||
    c.env?.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'dinheirizz-jwt-secret-dev-2026'
  )
}

function getSupabaseConfig(c: any) {
  const url =
    c.env?.SUPABASE_URL ||
    c.env?.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  const anonKey =
    c.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    c.env?.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  return { url: url.replace(/\/$/, ''), anonKey }
}

// POST /api/v1/auth/signup
authRouter.post('/signup', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = signupSchema.safeParse(rawBody)

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

  const { email: rawEmail, password, fullName, username: rawUsername } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const username = rawUsername ? rawUsername.toLowerCase().trim() : null
  const db = getDb()

  // 1. Verificação prévia de duplicatas no banco de dados
  if (!db) {
    // Ambiente mock / testes
    const emailExists = Array.from(mockAuthStore.values()).some((u) => u.email === email)
    if (emailExists) {
      return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
    }
    if (username) {
      const usernameExists = Array.from(mockAuthStore.values()).some((u) => u.username === username)
      if (usernameExists) {
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      }
    }

    const mockId = crypto.randomUUID()
    const mockUser: LocalAuthUser = {
      id: mockId,
      email,
      passwordHash: password,
      fullName: fullName || null,
      username,
      provider: 'email',
      providers: ['email'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockAuthStore.set(mockId, mockUser)

    return c.json(
      {
        success: true,
        message: 'Cadastro realizado com sucesso.'
      },
      201
    )
  }

  try {
    // Verifica email duplicado em public.users
    const existingUsers = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), username ? eq(users.username, username) : sql`false`))
      .limit(1)

    if (existingUsers.length > 0) {
      const found = existingUsers[0]
      if (found.email === email) {
        return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
      }
      if (username && found.username === username) {
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      }
    }

    // Verifica email em auth.users do Supabase (cobrindo pendentes)
    const authRecords = await db
      .execute(sql`SELECT id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`)
      .catch(() => [])

    if (authRecords.length > 0) {
      return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
    }

    // 2. Criação do usuário no Supabase Auth via REST server-to-server
    const { url: supabaseUrl, anonKey } = getSupabaseConfig(c)
    let createdUserId = crypto.randomUUID()

    if (supabaseUrl && anonKey) {
      const supaRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            full_name: fullName,
            username
          }
        })
      })

      const supaData = await supaRes.json().catch(() => ({}))

      if (!supaRes.ok) {
        const errorMsg = supaData.msg || supaData.error_description || supaData.message || 'Erro ao cadastrar usuário'
        if (errorMsg.toLowerCase().includes('already registered')) {
          return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
        }
        return c.json({ error: errorMsg }, supaRes.status as any)
      }

      // Se identities for vazio, o Supabase já possuía o e-mail cadastrado
      if (supaData.identities && Array.isArray(supaData.identities) && supaData.identities.length === 0) {
        return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
      }

      if (supaData.id) {
        createdUserId = supaData.id
      }
    }

    // 3. Persistência atômica no banco de dados da aplicação (public.users)
    await db
      .insert(users)
      .values({
        id: createdUserId,
        email,
        fullName: fullName || null,
        username,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          fullName: fullName || null,
          username,
          updatedAt: new Date()
        }
      })

    // Retorno estritamente sanitizado - Zero vazamento de dados internos
    return c.json(
      {
        success: true,
        message: 'Cadastro realizado com sucesso.'
      },
      201
    )
  } catch (error: any) {
    return c.json({ error: 'Erro interno ao processar cadastro', message: error?.message }, 500)
  }
})

// POST /api/v1/auth/login
authRouter.post('/login', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = loginSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Credenciais inválidas',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const { email: rawEmail, password } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const db = getDb()
  const secret = getJwtSecret(c)

  // 1. Cenário de Mock / Testes unitários
  if (!db) {
    const user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    if (!user || (user.passwordHash && user.passwordHash !== password)) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401)
    }

    const token = await sign(
      {
        sub: user.id,
        id: user.id,
        email: user.email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 dias
      },
      secret,
      'HS256'
    )

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      }
    })
  }

  try {
    const { url: supabaseUrl, anonKey } = getSupabaseConfig(c)
    let authUserId: string | null = null

    // 2. Autenticação server-side com Supabase Auth
    if (supabaseUrl && anonKey) {
      const supaRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const supaData = await supaRes.json().catch(() => ({}))

      if (!supaRes.ok) {
        return c.json({ error: 'E-mail ou senha incorretos' }, 401)
      }

      authUserId = supaData.user?.id || null
    }

    // 3. Localiza ou sincroniza usuário em public.users
    const records = await db
      .select()
      .from(users)
      .where(authUserId ? or(eq(users.id, authUserId), eq(users.email, email)) : eq(users.email, email))
      .limit(1)

    let userRecord = records[0]

    if (!userRecord) {
      const newId = authUserId || crypto.randomUUID()
      const inserted = await db
        .insert(users)
        .values({
          id: newId,
          email,
          provider: 'email',
          providers: ['email'],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
      userRecord = inserted[0]
    }

    // 4. Emissão de JWT próprio assinado pelo BFF
    const token = await sign(
      {
        sub: userRecord.id,
        id: userRecord.id,
        email: userRecord.email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 dias
      },
      secret,
      'HS256'
    )

    // Retorno estritamente sanitizado
    return c.json({
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName ?? null,
        username: userRecord.username ?? null
      }
    })
  } catch (error: any) {
    return c.json({ error: 'Erro interno ao autenticar usuário', message: error?.message }, 500)
  }
})

// POST /api/v1/auth/logout
authRouter.post('/logout', async (c) => {
  return c.json({ success: true, message: 'Sessão encerrada com sucesso.' })
})

// GET /api/v1/auth/me (Protegido por authMiddleware)
authRouter.get('/me', async (c) => {
  const userId = c.get('userId')
  const authUser = c.get('user')
  const email = ((authUser?.email as string) || '').toLowerCase()

  const db = getDb()

  if (!db) {
    let user = mockAuthStore.get(userId)
    if (!user && email) {
      user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    }

    if (!user) {
      return c.json({
        user: {
          id: userId,
          email: email || 'user@dinheirizz.com',
          fullName: null,
          username: null
        }
      })
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      }
    })
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
        user: {
          id: u.id,
          email: u.email,
          fullName: u.fullName ?? null,
          username: u.username ?? null
        }
      })
    }

    return c.json({
      user: {
        id: userId,
        email,
        fullName: null,
        username: null
      }
    })
  } catch {
    return c.json({ error: 'Erro ao buscar perfil autenticado' }, 500)
  }
})
