import { Hono } from 'hono'
import { z } from 'zod'
import { eq, and, asc, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { savingsGoals, users } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import { calculateGoalMetrics, type GoalMetrics } from '../services/goals'
import { parseProfileIdQuery, resolveUserProfileId } from '../lib/profileFilter'

const deadlineSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Prazo inválido' })
  .optional()
  .nullable()

export const createGoalSchema = z.object({
  name: z
    .string({ required_error: 'Nome da meta é obrigatório' })
    .trim()
    .min(1, 'Nome da meta não pode ser vazio')
    .max(100, 'Nome da meta deve ter no máximo 100 caracteres'),
  targetAmount: z
    .number({ required_error: 'Valor alvo é obrigatório' })
    .positive('O valor alvo deve ser maior que zero'),
  currentAmount: z.number().min(0, 'O valor atual não pode ser negativo').optional().default(0),
  deadline: deadlineSchema,
  profileId: z.string().uuid('ID de perfil inválido').optional().nullable(),
  icon: z.string().trim().max(50).optional().default('piggy-bank'),
  color: z.string().trim().max(20).optional().default('#7bc816')
})

export const updateGoalSchema = createGoalSchema.partial()

export const contributeGoalSchema = z.object({
  amount: z
    .number({ required_error: 'Valor do aporte é obrigatório' })
    .positive('O valor do aporte deve ser maior que zero')
})

export interface MockSavingsGoal {
  id: string
  userId: string
  profileId: string | null
  name: string
  targetAmount: string
  currentAmount: string
  deadline: string | null
  icon: string | null
  color: string | null
  createdAt: string
  updatedAt: string
}

export interface GoalWithMetrics extends GoalMetrics {
  id: string
  userId: string
  profileId: string | null
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  icon: string | null
  color: string | null
  createdAt: string
}

export const mockGoalsStore = new Map<string, MockSavingsGoal>()

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const serializeGoal = (row: {
  id: string
  userId: string
  profileId: string | null
  name: string
  targetAmount: string
  currentAmount: string
  deadline: Date | string | null
  icon: string | null
  color: string | null
  createdAt: Date | string
}): GoalWithMetrics => {
  const targetAmount = parseFloat(row.targetAmount) || 0
  const currentAmount = parseFloat(row.currentAmount) || 0
  const deadlineIso =
    row.deadline instanceof Date
      ? row.deadline.toISOString()
      : row.deadline
        ? String(row.deadline)
        : null
  const createdAtIso =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)

  const metrics = calculateGoalMetrics({
    targetAmount,
    currentAmount,
    deadline: deadlineIso
  })

  return {
    id: row.id,
    userId: row.userId,
    profileId: row.profileId,
    name: row.name,
    targetAmount,
    currentAmount,
    deadline: deadlineIso,
    icon: row.icon,
    color: row.color,
    createdAt: createdAtIso,
    ...metrics
  }
}

export const goalsRouter = new Hono<AuthEnv>()

// GET /api/v1/goals?profileId=<uuid|all>
goalsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const parsedProfile = parseProfileIdQuery(c.req.query('profileId'))
  if (!parsedProfile.valid) {
    return c.json({ error: 'Parâmetro profileId inválido' }, 400)
  }

  const db = getDb()
  let items: GoalWithMetrics[] = []

  if (!db) {
    items = Array.from(mockGoalsStore.values())
      .filter(
        (g) =>
          g.userId === userId &&
          (!parsedProfile.profileId || g.profileId === parsedProfile.profileId)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(serializeGoal)
  } else {
    try {
      const conditions = [eq(savingsGoals.userId, userId)]
      if (parsedProfile.profileId) {
        conditions.push(eq(savingsGoals.profileId, parsedProfile.profileId))
      }

      const rows = await db
        .select()
        .from(savingsGoals)
        .where(and(...conditions))
        .orderBy(asc(savingsGoals.createdAt))

      items = rows.map(serializeGoal)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      return c.json({ error: 'Falha ao buscar metas de economia', details: message }, 500)
    }
  }

  const totalSaved = Math.round(items.reduce((sum, g) => sum + g.currentAmount, 0) * 100) / 100
  const totalTarget = Math.round(items.reduce((sum, g) => sum + g.targetAmount, 0) * 100) / 100
  const completedCount = items.filter((g) => g.isCompleted).length
  const activeCount = items.length - completedCount

  return c.json({
    goals: items,
    summary: {
      totalSaved,
      totalTarget,
      activeCount,
      completedCount
    }
  })
})

// POST /api/v1/goals
goalsRouter.post('/', async (c) => {
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

  const parsed = createGoalSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      },
      400
    )
  }

  const data = parsed.data
  const db = getDb()

  const profileRes = await resolveUserProfileId(db, userId, data.profileId)
  if (!profileRes.ok) {
    return c.json({ error: profileRes.error }, profileRes.status)
  }

  const deadlineDate = data.deadline ? new Date(data.deadline) : null

  if (!db) {
    const now = new Date().toISOString()
    const created: MockSavingsGoal = {
      id: crypto.randomUUID(),
      userId,
      profileId: profileRes.profileId,
      name: data.name,
      targetAmount: data.targetAmount.toFixed(2),
      currentAmount: data.currentAmount.toFixed(2),
      deadline: deadlineDate ? deadlineDate.toISOString() : null,
      icon: data.icon,
      color: data.color,
      createdAt: now,
      updatedAt: now
    }
    mockGoalsStore.set(created.id, created)
    return c.json({ goal: serializeGoal(created) }, 201)
  }

  try {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (existingUser.length === 0) {
      const authUser = c.get('user')
      await db
        .insert(users)
        .values({
          id: userId,
          email: authUser?.email || `${userId}@dinheirizz.com`,
          provider: 'email',
          providers: ['email'],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoNothing()
    }

    const [created] = await db
      .insert(savingsGoals)
      .values({
        userId,
        profileId: profileRes.profileId,
        name: data.name,
        targetAmount: data.targetAmount.toFixed(2),
        currentAmount: data.currentAmount.toFixed(2),
        deadline: deadlineDate,
        icon: data.icon,
        color: data.color
      })
      .returning()

    return c.json({ goal: serializeGoal(created) }, 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao criar meta de economia', details: message }, 500)
  }
})

// PATCH /api/v1/goals/:id
goalsRouter.patch('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const goalId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = updateGoalSchema.safeParse(body)
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

  let resolvedProfileId: string | null | undefined = undefined
  if (updates.profileId !== undefined) {
    const profileRes = await resolveUserProfileId(db, userId, updates.profileId)
    if (!profileRes.ok) {
      return c.json({ error: profileRes.error }, profileRes.status)
    }
    resolvedProfileId = profileRes.profileId
  }

  if (!db) {
    const existing = mockGoalsStore.get(goalId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    const updated: MockSavingsGoal = {
      ...existing,
      name: updates.name ?? existing.name,
      targetAmount:
        updates.targetAmount !== undefined
          ? updates.targetAmount.toFixed(2)
          : existing.targetAmount,
      currentAmount:
        updates.currentAmount !== undefined
          ? updates.currentAmount.toFixed(2)
          : existing.currentAmount,
      deadline:
        updates.deadline !== undefined
          ? updates.deadline
            ? new Date(updates.deadline).toISOString()
            : null
          : existing.deadline,
      profileId: resolvedProfileId !== undefined ? resolvedProfileId : existing.profileId,
      icon: updates.icon ?? existing.icon,
      color: updates.color ?? existing.color,
      updatedAt: new Date().toISOString()
    }
    mockGoalsStore.set(goalId, updated)
    return c.json({ goal: serializeGoal(updated) })
  }

  if (!UUID_REGEX.test(goalId)) {
    return c.json({ error: 'Meta não encontrada' }, 404)
  }

  try {
    const [updated] = await db
      .update(savingsGoals)
      .set({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.targetAmount !== undefined
          ? { targetAmount: updates.targetAmount.toFixed(2) }
          : {}),
        ...(updates.currentAmount !== undefined
          ? { currentAmount: updates.currentAmount.toFixed(2) }
          : {}),
        ...(updates.deadline !== undefined
          ? { deadline: updates.deadline ? new Date(updates.deadline) : null }
          : {}),
        ...(resolvedProfileId !== undefined ? { profileId: resolvedProfileId } : {}),
        ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
      .returning()

    if (!updated) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    return c.json({ goal: serializeGoal(updated) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao atualizar meta', details: message }, 500)
  }
})

// POST /api/v1/goals/:id/contribute
goalsRouter.post('/:id/contribute', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const goalId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = contributeGoalSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      },
      400
    )
  }

  const { amount } = parsed.data
  const db = getDb()

  if (!db) {
    const existing = mockGoalsStore.get(goalId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    const nextAmount = Math.round(((parseFloat(existing.currentAmount) || 0) + amount) * 100) / 100
    const updated: MockSavingsGoal = {
      ...existing,
      currentAmount: nextAmount.toFixed(2),
      updatedAt: new Date().toISOString()
    }
    mockGoalsStore.set(goalId, updated)
    return c.json({ goal: serializeGoal(updated) })
  }

  if (!UUID_REGEX.test(goalId)) {
    return c.json({ error: 'Meta não encontrada' }, 404)
  }

  try {
    const formattedAmount = amount.toFixed(2)
    const [updated] = await db
      .update(savingsGoals)
      .set({
        currentAmount: sql`${savingsGoals.currentAmount} + ${formattedAmount}`,
        updatedAt: new Date()
      })
      .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
      .returning()

    if (!updated) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    return c.json({ goal: serializeGoal(updated) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao registrar aporte na meta', details: message }, 500)
  }
})

// DELETE /api/v1/goals/:id
goalsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const goalId = c.req.param('id')
  const db = getDb()

  if (!db) {
    const existing = mockGoalsStore.get(goalId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }
    mockGoalsStore.delete(goalId)
    return c.json({ success: true, id: goalId })
  }

  if (!UUID_REGEX.test(goalId)) {
    return c.json({ error: 'Meta não encontrada' }, 404)
  }

  try {
    const deleted = await db
      .delete(savingsGoals)
      .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
      .returning()

    if (deleted.length === 0) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    return c.json({ success: true, id: goalId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao excluir meta', details: message }, 500)
  }
})
