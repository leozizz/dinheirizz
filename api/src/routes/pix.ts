import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { pixKeys, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'

export const createPixKeySchema = z.object({
  keyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random'], {
    errorMap: () => ({ message: 'Tipo de chave Pix inválido. Use cpf, cnpj, email, phone ou random' })
  }),
  keyValue: z.string({ required_error: 'Chave Pix é obrigatória' }).min(1, 'Chave Pix não pode ser vazia').max(255),
  bankName: z.string({ required_error: 'Instituição bancária é obrigatória' }).min(1, 'Banco não pode ser vazio').max(100),
  description: z.string().max(255).optional().nullable()
})

export interface MockPixKey {
  id: string
  userId: string
  keyType: string
  keyValue: string
  bankName: string
  description?: string | null
  createdAt: string
}

export const mockPixKeysStore = new Map<string, MockPixKey>([
  [
    'mock-pix-1',
    {
      id: 'mock-pix-1',
      userId: '00000000-0000-0000-0000-000000000000',
      keyType: 'email',
      keyValue: 'contato@dinheirizz.com',
      bankName: 'Nubank Institucional',
      description: 'Chave Principal',
      createdAt: new Date().toISOString()
    }
  ]
])

export const pixKeysRouter = new Hono<AuthEnv>()

pixKeysRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    const list = Array.from(mockPixKeysStore.values()).filter(
      (k) => k.userId === userId || k.userId === '00000000-0000-0000-0000-000000000000'
    )
    return c.json({ data: list, total: list.length })
  }

  try {
    const list = await db.select().from(pixKeys).where(eq(pixKeys.userId, userId))
    return c.json({ data: list, total: list.length })
  } catch (error: any) {
    return c.json({ error: 'Falha ao buscar chaves Pix', details: error?.message }, 500)
  }
})

pixKeysRouter.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = createPixKeySchema.safeParse(body)
  if (!result.success) {
    return c.json({
      error: 'Dados inválidos',
      details: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    }, 400)
  }

  const data = result.data
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    const id = crypto.randomUUID()
    const newKey: MockPixKey = {
      id,
      userId,
      keyType: data.keyType,
      keyValue: data.keyValue,
      bankName: data.bankName,
      description: data.description ?? null,
      createdAt: new Date().toISOString()
    }
    mockPixKeysStore.set(id, newKey)
    return c.json(newKey, 201)
  }

  try {
    // Garante usuário existente em public.users
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (existingUser.length === 0) {
      const authUser = c.get('user')
      await db.insert(users).values({
        id: userId,
        email: authUser?.email || `${userId}@dinheirizz.com`,
        fullName: (authUser?.user_metadata as any)?.full_name || null,
        username: (authUser?.user_metadata as any)?.username || null,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }

    const inserted = await db.insert(pixKeys).values({
      userId,
      keyType: data.keyType,
      keyValue: data.keyValue,
      bankName: data.bankName,
      description: data.description ?? null
    }).returning()

    return c.json(inserted[0], 201)
  } catch (error: any) {
    return c.json({ error: 'Erro ao cadastrar chave Pix', details: error?.message }, 500)
  }
})

pixKeysRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    mockPixKeysStore.delete(id)
    return c.json({ success: true, id })
  }

  try {
    await db.delete(pixKeys).where(and(eq(pixKeys.id, id), eq(pixKeys.userId, userId)))
    return c.json({ success: true, id })
  } catch (error: any) {
    return c.json({ error: 'Erro ao remover chave Pix', details: error?.message }, 500)
  }
})
