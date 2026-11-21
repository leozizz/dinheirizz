import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { accounts, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import { parseProfileIdQuery, resolveUserProfileId } from '../lib/profileFilter'

export const createAccountSchema = z.object({
  name: z.string({ required_error: 'Nome da conta é obrigatório' }).min(1, 'Nome não pode ser vazio').max(100),
  type: z.enum(['checking', 'savings', 'investment', 'cash']).optional().default('checking'),
  balance: z.number().optional().default(0),
  profileId: z.string().uuid('ID de perfil inválido').optional().nullable()
})

export interface MockAccount {
  id: string
  userId: string
  profileId?: string | null
  name: string
  type: string
  balance: string
  createdAt: string
}

// Armazenamento em memória para testes unitários / modo offline
export const mockAccountsStore = new Map<string, MockAccount>([
  [
    'mock-acc-default',
    {
      id: 'mock-acc-default',
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Conta Principal',
      type: 'checking',
      balance: '0.00',
      createdAt: new Date().toISOString()
    }
  ]
])

export const accountsRouter = new Hono<AuthEnv>()

accountsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const parsedProfile = parseProfileIdQuery(c.req.query('profileId'))
  if (!parsedProfile.valid) {
    return c.json({ error: 'Parâmetro profileId inválido' }, 400)
  }

  const db = getDb()

  if (!db) {
    const list = Array.from(mockAccountsStore.values()).filter(
      (a) =>
        (a.userId === userId || a.userId === '00000000-0000-0000-0000-000000000000') &&
        (!parsedProfile.profileId || a.profileId === parsedProfile.profileId)
    )
    return c.json({ data: list, total: list.length })
  }

  try {
    const whereClause = parsedProfile.profileId
      ? and(eq(accounts.userId, userId), eq(accounts.profileId, parsedProfile.profileId))
      : eq(accounts.userId, userId)
    const list = await db.select().from(accounts).where(whereClause)
    return c.json({ data: list, total: list.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar contas', details: message }, 500)
  }
})

accountsRouter.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = createAccountSchema.safeParse(body)
  if (!result.success) {
    return c.json({
      error: 'Dados inválidos',
      details: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    }, 400)
  }

  const data = result.data
  const userId = c.get('userId')
  const db = getDb()

  const profileRes = await resolveUserProfileId(db, userId, data.profileId)
  if (!profileRes.ok) {
    return c.json({ error: profileRes.error }, profileRes.status)
  }

  if (!db) {
    const id = crypto.randomUUID()
    const newAcc: MockAccount = {
      id,
      userId,
      profileId: profileRes.profileId,
      name: data.name,
      type: data.type,
      balance: data.balance.toFixed(2),
      createdAt: new Date().toISOString()
    }
    mockAccountsStore.set(id, newAcc)
    return c.json(newAcc, 201)
  }

  try {
    // Garante integridade do usuário em public.users
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (existingUser.length === 0) {
      const authUser = c.get('user')
      await db.insert(users).values({
        id: userId,
        email: authUser?.email || `${userId}@dinheirizz.com`,
        fullName: (authUser?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | null ?? null,
        username: (authUser?.user_metadata as Record<string, unknown> | undefined)?.username as string | null ?? null,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }

    const inserted = await db.insert(accounts).values({
      userId,
      profileId: profileRes.profileId,
      name: data.name,
      type: data.type,
      balance: data.balance.toFixed(2)
    }).returning()

    return c.json(inserted[0], 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Erro ao criar conta', details: message }, 500)
  }
})

accountsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    mockAccountsStore.delete(id)
    return c.json({ success: true, id })
  }

  try {
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    return c.json({ success: true, id })
  } catch (error: any) {
    return c.json({ error: 'Erro ao remover conta', details: error?.message }, 500)
  }
})
