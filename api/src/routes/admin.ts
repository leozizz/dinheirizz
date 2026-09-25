import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'

const ADMIN_EMAIL = 'leonardocps2015@gmail.com'

export interface AdminUserRecord {
  id: string
  email: string
  fullName: string | null
  role: 'free' | 'pro' | 'admin'
  proType: 'subscriber' | 'invited' | null
  proExpiresAt: string | null
  createdAt: string
}

// Armazenamento em memória para testes unitários ou offline
export const mockAdminUsersStore = new Map<string, AdminUserRecord>([
  [
    '00000000-0000-0000-0000-000000000001',
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: ADMIN_EMAIL,
      fullName: 'Leonardo Admin',
      role: 'admin',
      proType: null,
      proExpiresAt: null,
      createdAt: new Date().toISOString()
    }
  ],
  [
    '00000000-0000-0000-0000-000000000002',
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'regular.user@dinheirizz.com',
      fullName: 'Usuário Regular',
      role: 'free',
      proType: null,
      proExpiresAt: null,
      createdAt: new Date().toISOString()
    }
  ],
  [
    '00000000-0000-0000-0000-000000000003',
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'target.user@dinheirizz.com',
      fullName: 'Usuário Alvo',
      role: 'free',
      proType: null,
      proExpiresAt: null,
      createdAt: new Date().toISOString()
    }
  ]
])

export const inviteBodySchema = z
  .object({
    targetUserId: z.string().optional(),
    email: z.string().email('E-mail inválido').optional(),
    action: z.enum(['grant', 'revoke']),
    expiresAt: z.string().optional().nullable()
  })
  .refine((data) => Boolean(data.targetUserId || data.email), {
    message: 'Informe targetUserId ou o e-mail do usuário'
  })

export const adminRouter = new Hono<AuthEnv>()

/**
 * Verifica se o usuário atual é admin
 */
async function checkIsAdmin(c: any): Promise<boolean> {
  const userEmail = (c.get('user') as any)?.email
  if (userEmail?.toLowerCase() === ADMIN_EMAIL) {
    return true
  }

  const userId = c.get('userId')
  if (!userId) return false

  const memUser = mockAdminUsersStore.get(userId)
  if (memUser && memUser.role === 'admin') return true

  const db = getDb()
  if (db) {
    try {
      const rows = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (rows.length > 0) {
        return (
          rows[0].role === 'admin' ||
          rows[0].email?.toLowerCase() === ADMIN_EMAIL
        )
      }
    } catch {
      // fallback
    }
  }

  return false
}

// Middleware de verificação admin em todas as rotas
adminRouter.use('*', async (c, next) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const isAdmin = await checkIsAdmin(c)
  if (!isAdmin) {
    return c.json(
      { error: 'Acesso negado: requer privilégios de administrador' },
      403
    )
  }

  await next()
})

// GET /api/v1/admin/users
adminRouter.get('/users', async (c) => {
  const db = getDb()
  if (!db) {
    return c.json({ users: Array.from(mockAdminUsersStore.values()) })
  }

  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        proType: users.proType,
        proExpiresAt: users.proExpiresAt,
        createdAt: users.createdAt
      })
      .from(users)

    const list = rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      role: (r.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : (r.role || 'free')) as 'free' | 'pro' | 'admin',
      proType: r.proType as 'subscriber' | 'invited' | null,
      proExpiresAt: r.proExpiresAt ? r.proExpiresAt.toISOString() : null,
      createdAt: r.createdAt.toISOString()
    }))

    return c.json({ users: list })
  } catch {
    return c.json({ users: Array.from(mockAdminUsersStore.values()) })
  }
})

// POST /api/v1/admin/invites
adminRouter.post('/invites', async (c) => {
  const adminId = c.get('userId')!
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = inviteBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
  }

  let { targetUserId, email, action, expiresAt } = parsed.data
  const db = getDb()

  if (!targetUserId && email) {
    if (db) {
      try {
        const found = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1)

        if (found.length > 0) {
          targetUserId = found[0].id
        }
      } catch {
        // fallback
      }
    }

    if (!targetUserId) {
      for (const [id, u] of mockAdminUsersStore.entries()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          targetUserId = id
          break
        }
      }
    }

    if (!targetUserId) {
      if (!db) {
        targetUserId = `invited-${Date.now()}`
        mockAdminUsersStore.set(targetUserId, {
          id: targetUserId,
          email: email.toLowerCase(),
          fullName: 'Usuário Convidado',
          role: 'free',
          proType: null,
          proExpiresAt: null,
          createdAt: new Date().toISOString()
        })
      } else {
        return c.json(
          { error: 'Usuário com este e-mail não encontrado. O usuário deve se cadastrar no app primeiro.' },
          404
        )
      }
    }
  }

  let newRole: 'free' | 'pro' = 'free'
  let newProType: 'invited' | null = null
  let newExpiresAt: string | null = null

  if (action === 'grant') {
    newRole = 'pro'
    newProType = 'invited'
    newExpiresAt = expiresAt || null
  }

  // Atualizar na store em memória
  const existingMem = mockAdminUsersStore.get(targetUserId!)
  if (existingMem) {
    existingMem.role = newRole
    existingMem.proType = newProType
    existingMem.proExpiresAt = newExpiresAt
  } else {
    mockAdminUsersStore.set(targetUserId!, {
      id: targetUserId!,
      email: email?.toLowerCase() || 'user@dinheirizz.com',
      fullName: 'Usuário Convidado',
      role: newRole,
      proType: newProType,
      proExpiresAt: newExpiresAt,
      createdAt: new Date().toISOString()
    })
  }

  // Atualizar no banco de dados se conectado
  if (db) {
    try {
      await db
        .update(users)
        .set({
          role: newRole,
          proType: newProType,
          proExpiresAt: newExpiresAt ? new Date(newExpiresAt) : null,
          invitedBy: action === 'grant' ? adminId : null
        })
        .where(eq(users.id, targetUserId!))
    } catch {
      // memoria preservada
    }
  }

  const updatedUser = mockAdminUsersStore.get(targetUserId!)!

  return c.json({
    message:
      action === 'grant'
        ? 'Acesso Pro concedido por convite com sucesso!'
        : 'Acesso Pro revogado com sucesso.',
    user: updatedUser
  })
})
