import { Hono } from 'hono'
import { z } from 'zod'
import { eq, and, desc, asc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { financialProfiles, users } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'

export const workspaceTypeEnum = z.enum(['personal', 'business'])

export const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Nome do perfil é obrigatório' })
    .trim()
    .min(1, 'Nome do perfil não pode ser vazio')
    .max(60, 'Nome do perfil deve ter no máximo 60 caracteres'),
  type: workspaceTypeEnum.optional().default('personal'),
  currency: z.string().trim().min(3).max(10).optional().default('BRL'),
  isDefault: z.boolean().optional().default(false)
})

export const updateWorkspaceSchema = createWorkspaceSchema.partial()

export interface MockFinancialProfile {
  id: string
  userId: string
  name: string
  type: 'personal' | 'business'
  currency: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export const mockWorkspacesStore = new Map<string, MockFinancialProfile>()

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ensureDbUser = async (
  db: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
  authUser: AuthEnv['Variables']['user']
): Promise<void> => {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existingUser.length === 0) {
    const metadata = authUser?.user_metadata as Record<string, unknown> | undefined
    await db
      .insert(users)
      .values({
        id: userId,
        email: authUser?.email || `${userId}@dinheirizz.com`,
        fullName: typeof metadata?.full_name === 'string' ? metadata.full_name : null,
        username: typeof metadata?.username === 'string' ? metadata.username : null,
        provider: 'email',
        providers: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing()
  }
}

export const workspacesRouter = new Hono<AuthEnv>()

// GET /api/v1/workspaces
workspacesRouter.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const db = getDb()

  if (!db) {
    let profiles = Array.from(mockWorkspacesStore.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
        return a.createdAt.localeCompare(b.createdAt)
      })

    if (profiles.length === 0) {
      const now = new Date().toISOString()
      const defaultProfile: MockFinancialProfile = {
        id: crypto.randomUUID(),
        userId,
        name: 'Pessoal',
        type: 'personal',
        currency: 'BRL',
        isDefault: true,
        createdAt: now,
        updatedAt: now
      }
      mockWorkspacesStore.set(defaultProfile.id, defaultProfile)
      profiles = [defaultProfile]
    }

    const activeDefault = profiles.find((p) => p.isDefault) || profiles[0]
    return c.json({
      profiles,
      activeDefaultId: activeDefault?.id ?? null
    })
  }

  try {
    let profiles = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .orderBy(desc(financialProfiles.isDefault), asc(financialProfiles.createdAt))

    if (profiles.length === 0) {
      await ensureDbUser(db, userId, c.get('user'))
      const [created] = await db
        .insert(financialProfiles)
        .values({
          userId,
          name: 'Pessoal',
          type: 'personal',
          currency: 'BRL',
          isDefault: true
        })
        .returning()
      profiles = [created]
    }

    const activeDefault = profiles.find((p) => p.isDefault) || profiles[0]
    return c.json({
      profiles,
      activeDefaultId: activeDefault?.id ?? null
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao buscar perfis financeiros', details: message }, 500)
  }
})

// POST /api/v1/workspaces
workspacesRouter.post('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = createWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      },
      400
    )
  }

  const { name, type, currency, isDefault } = parsed.data
  const db = getDb()

  if (!db) {
    const existing = Array.from(mockWorkspacesStore.values()).filter((p) => p.userId === userId)
    const shouldBeDefault = existing.length === 0 ? true : isDefault

    if (shouldBeDefault) {
      for (const p of existing) {
        if (p.isDefault) {
          mockWorkspacesStore.set(p.id, { ...p, isDefault: false, updatedAt: new Date().toISOString() })
        }
      }
    }

    const now = new Date().toISOString()
    const profile: MockFinancialProfile = {
      id: crypto.randomUUID(),
      userId,
      name,
      type,
      currency,
      isDefault: shouldBeDefault,
      createdAt: now,
      updatedAt: now
    }
    mockWorkspacesStore.set(profile.id, profile)
    return c.json({ profile }, 201)
  }

  try {
    await ensureDbUser(db, userId, c.get('user'))
    const existing = await db
      .select({ id: financialProfiles.id })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))

    const shouldBeDefault = existing.length === 0 ? true : isDefault

    if (shouldBeDefault) {
      await db
        .update(financialProfiles)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(financialProfiles.userId, userId))
    }

    const [profile] = await db
      .insert(financialProfiles)
      .values({
        userId,
        name,
        type,
        currency,
        isDefault: shouldBeDefault
      })
      .returning()

    return c.json({ profile }, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao criar perfil financeiro', details: message }, 500)
  }
})

// PATCH /api/v1/workspaces/:id
workspacesRouter.patch('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const profileId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = updateWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      },
      400
    )
  }

  const updates = parsed.data
  const db = getDb()

  if (!db) {
    const existing = mockWorkspacesStore.get(profileId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
    }

    if (updates.isDefault === true) {
      for (const p of mockWorkspacesStore.values()) {
        if (p.userId === userId && p.id !== profileId && p.isDefault) {
          mockWorkspacesStore.set(p.id, { ...p, isDefault: false, updatedAt: new Date().toISOString() })
        }
      }
    }

    const updated: MockFinancialProfile = {
      ...existing,
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
      currency: updates.currency ?? existing.currency,
      isDefault: updates.isDefault ?? existing.isDefault,
      updatedAt: new Date().toISOString()
    }
    mockWorkspacesStore.set(profileId, updated)
    return c.json({ profile: updated })
  }

  if (!UUID_REGEX.test(profileId)) {
    return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
  }

  try {
    const [existing] = await db
      .select()
      .from(financialProfiles)
      .where(and(eq(financialProfiles.id, profileId), eq(financialProfiles.userId, userId)))
      .limit(1)

    if (!existing) {
      return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
    }

    if (updates.isDefault === true) {
      await db
        .update(financialProfiles)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(financialProfiles.userId, userId))
    }

    const [updated] = await db
      .update(financialProfiles)
      .set({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.type !== undefined ? { type: updates.type } : {}),
        ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
        ...(updates.isDefault !== undefined ? { isDefault: updates.isDefault } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(financialProfiles.id, profileId), eq(financialProfiles.userId, userId)))
      .returning()

    return c.json({ profile: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao atualizar perfil financeiro', details: message }, 500)
  }
})

// DELETE /api/v1/workspaces/:id
workspacesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const profileId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const existing = mockWorkspacesStore.get(profileId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
    }

    const userProfiles = Array.from(mockWorkspacesStore.values()).filter((p) => p.userId === userId)
    if (existing.isDefault || userProfiles.length <= 1) {
      return c.json(
        { error: 'Não é possível excluir o perfil padrão ou único perfil do usuário' },
        400
      )
    }

    mockWorkspacesStore.delete(profileId)
    return c.json({ success: true, id: profileId })
  }

  if (!UUID_REGEX.test(profileId)) {
    return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
  }

  try {
    const userProfiles = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))

    const target = userProfiles.find((p) => p.id === profileId)
    if (!target) {
      return c.json({ error: 'Perfil financeiro não encontrado' }, 404)
    }

    if (target.isDefault || userProfiles.length <= 1) {
      return c.json(
        { error: 'Não é possível excluir o perfil padrão ou único perfil do usuário' },
        400
      )
    }

    await db
      .delete(financialProfiles)
      .where(and(eq(financialProfiles.id, profileId), eq(financialProfiles.userId, userId)))

    return c.json({ success: true, id: profileId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao excluir perfil financeiro', details: message }, 500)
  }
})
