import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  pushSubscriptions,
  notificationPreferences,
  transactions,
  budgets,
  invoices
} from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import {
  subscribePushSchema,
  unsubscribePushSchema,
  updateNotificationPreferencesSchema
} from '../schemas/push'
import {
  getVapidPublicKey,
  sendWebPushNotification,
  type WebPushSubscription,
  type WebPushPayload
} from '../services/webPush'
import { mockTransactionsStore } from './transactions'
import { mockBudgetsStore } from './budgets'
import { mockInvoicesStore } from './creditCards'

export interface MockPushSubscription {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
  updatedAt: string | null
}

export interface MockNotificationPreference {
  id: string
  userId: string
  pushEnabled: boolean
  billsDueAlerts: boolean
  billsDueDaysBefore: 0 | 1 | 3
  budgetLimitAlerts: boolean
  budgetThresholdPercent: 80 | 85 | 90 | 100
  invoiceDueAlerts: boolean
  createdAt: string
  updatedAt: string | null
}

export const mockPushSubscriptionsStore = new Map<string, MockPushSubscription>()
export const mockNotificationPreferencesStore = new Map<string, MockNotificationPreference>()

export const pushRouter = new Hono<AuthEnv>()

// GET /api/v1/push/public-key (Obter chave pública VAPID)
pushRouter.get('/public-key', (c) => {
  const publicKey = getVapidPublicKey()
  return c.json({ vapidPublicKey: publicKey }, 200)
})

// GET /api/v1/push/preferences (Obter preferências de notificação do usuário)
pushRouter.get('/preferences', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    let prefs = mockNotificationPreferencesStore.get(userId)
    if (!prefs) {
      prefs = {
        id: crypto.randomUUID(),
        userId,
        pushEnabled: true,
        billsDueAlerts: true,
        billsDueDaysBefore: 1,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 85,
        invoiceDueAlerts: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      mockNotificationPreferencesStore.set(userId, prefs)
    }
    return c.json({ preferences: prefs }, 200)
  }

  try {
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      return c.json({ preferences: existing[0] }, 200)
    }

    // Criar padrão inicial se inexistente
    const [created] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        pushEnabled: true,
        billsDueAlerts: true,
        billsDueDaysBefore: 1,
        budgetLimitAlerts: true,
        budgetThresholdPercent: 85,
        invoiceDueAlerts: true
      })
      .returning()

    return c.json({ preferences: created }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar preferências'
    return c.json({ error: 'Erro interno ao consultar preferências', message }, 500)
  }
})

// PUT /api/v1/push/preferences (Atualizar preferências de notificação do usuário)
pushRouter.put('/preferences', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const parsed = updateNotificationPreferencesSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.issues }, 400)
  }

  const db = getDb()

  if (!db) {
    const existing = mockNotificationPreferencesStore.get(userId)
    const updated: MockNotificationPreference = {
      id: existing ? existing.id : crypto.randomUUID(),
      userId,
      pushEnabled: parsed.data.pushEnabled,
      billsDueAlerts: parsed.data.billsDueAlerts,
      billsDueDaysBefore: parsed.data.billsDueDaysBefore,
      budgetLimitAlerts: parsed.data.budgetLimitAlerts,
      budgetThresholdPercent: parsed.data.budgetThresholdPercent,
      invoiceDueAlerts: parsed.data.invoiceDueAlerts,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockNotificationPreferencesStore.set(userId, updated)

    return c.json(
      {
        message: 'Preferências de notificação atualizadas com sucesso',
        preferences: updated
      },
      200
    )
  }

  try {
    const [updated] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        pushEnabled: parsed.data.pushEnabled,
        billsDueAlerts: parsed.data.billsDueAlerts,
        billsDueDaysBefore: parsed.data.billsDueDaysBefore,
        budgetLimitAlerts: parsed.data.budgetLimitAlerts,
        budgetThresholdPercent: parsed.data.budgetThresholdPercent,
        invoiceDueAlerts: parsed.data.invoiceDueAlerts,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          pushEnabled: parsed.data.pushEnabled,
          billsDueAlerts: parsed.data.billsDueAlerts,
          billsDueDaysBefore: parsed.data.billsDueDaysBefore,
          budgetLimitAlerts: parsed.data.budgetLimitAlerts,
          budgetThresholdPercent: parsed.data.budgetThresholdPercent,
          invoiceDueAlerts: parsed.data.invoiceDueAlerts,
          updatedAt: new Date()
        }
      })
      .returning()

    return c.json(
      {
        message: 'Preferências de notificação atualizadas com sucesso',
        preferences: updated
      },
      200
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar preferências'
    return c.json({ error: 'Erro interno ao atualizar preferências', message }, 500)
  }
})

// POST /api/v1/push/subscribe (Registrar ou atualizar inscrição Web Push)
pushRouter.post('/subscribe', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const parsed = subscribePushSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos para inscrição Web Push', details: parsed.error.issues }, 400)
  }

  const { endpoint, keys, userAgent } = parsed.data
  const db = getDb()

  if (!db) {
    // Busca assinatura existente pelo endpoint
    let existingId: string | null = null
    for (const [id, sub] of mockPushSubscriptionsStore.entries()) {
      if (sub.endpoint === endpoint) {
        existingId = id
        break
      }
    }

    const id = existingId || crypto.randomUUID()
    const savedSub: MockPushSubscription = {
      id,
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    mockPushSubscriptionsStore.set(id, savedSub)

    return c.json(
      {
        message: 'Inscrição de push registrada com sucesso',
        subscriptionId: id
      },
      201
    )
  }

  try {
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent || null,
          updatedAt: new Date()
        })
        .where(eq(pushSubscriptions.id, existing[0].id))
        .returning()

      return c.json(
        {
          message: 'Inscrição de push registrada com sucesso',
          subscriptionId: updated.id
        },
        201
      )
    }

    const [created] = await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null
      })
      .returning()

    return c.json(
      {
        message: 'Inscrição de push registrada com sucesso',
        subscriptionId: created.id
      },
      201
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar inscrição'
    return c.json({ error: 'Erro interno ao registrar inscrição', message }, 500)
  }
})

// DELETE /api/v1/push/unsubscribe (Remover inscrição Web Push)
pushRouter.delete('/unsubscribe', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const parsed = unsubscribePushSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Endpoint inválido para cancelamento', details: parsed.error.issues }, 400)
  }

  const { endpoint } = parsed.data
  const db = getDb()

  if (!db) {
    for (const [id, sub] of mockPushSubscriptionsStore.entries()) {
      if (sub.endpoint === endpoint && sub.userId === userId) {
        mockPushSubscriptionsStore.delete(id)
      }
    }
    return c.json({ message: 'Inscrição de push cancelada com sucesso' }, 200)
  }

  try {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)))

    return c.json({ message: 'Inscrição de push cancelada com sucesso' }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar inscrição'
    return c.json({ error: 'Erro interno ao cancelar inscrição', message }, 500)
  }
})

// POST /api/v1/push/test (Disparar notificação de teste para o usuário)
pushRouter.post('/test', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  let userSubs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = []

  if (!db) {
    userSubs = Array.from(mockPushSubscriptionsStore.values()).filter((s) => s.userId === userId)
  } else {
    try {
      const records = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
      userSubs = records
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar inscrições'
      return c.json({ error: 'Erro ao buscar inscrições', message }, 500)
    }
  }

  if (userSubs.length === 0) {
    return c.json(
      {
        message: 'Nenhuma inscrição ativa encontrada para este usuário',
        sentCount: 0
      },
      200
    )
  }

  const testPayload: WebPushPayload = {
    title: 'Dinheirizz — Teste de Notificação',
    body: 'Suas notificações pró-ativas estão configuradas e funcionando!',
    icon: '/icon-192.png',
    badge: '/icon-light-32x32.png',
    data: { url: '/?open=notifications', type: 'test' }
  }

  let sentCount = 0
  const expiredIds: string[] = []

  for (const sub of userSubs) {
    const result = await sendWebPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth
      },
      testPayload
    )

    if (result.success) {
      sentCount++
    } else if (result.expired) {
      expiredIds.push(sub.id)
    }
  }

  // Limpeza de inscrições mortas
  if (expiredIds.length > 0) {
    if (!db) {
      for (const id of expiredIds) {
        mockPushSubscriptionsStore.delete(id)
      }
    } else {
      try {
        for (const id of expiredIds) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
        }
      } catch {
        // Falha tolerável na limpeza
      }
    }
  }

  return c.json(
    {
      message: 'Notificação de teste disparada com sucesso',
      sentCount
    },
    200
  )
})

// POST /api/v1/push/dispatch-alerts (Processamento e despacho em lote de contas a vencer e limites)
pushRouter.post('/dispatch-alerts', async (c) => {
  const db = getDb()

  let allSubs: Array<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string }> = []
  let allPrefs: Map<string, MockNotificationPreference> = new Map()

  if (!db) {
    allSubs = Array.from(mockPushSubscriptionsStore.values())
    allPrefs = mockNotificationPreferencesStore
  } else {
    try {
      allSubs = await db.select().from(pushSubscriptions)
      const prefsRecords = await db.select().from(notificationPreferences)
      for (const p of prefsRecords) {
        allPrefs.set(p.userId, {
          id: p.id,
          userId: p.userId,
          pushEnabled: p.pushEnabled,
          billsDueAlerts: p.billsDueAlerts,
          billsDueDaysBefore: (p.billsDueDaysBefore as 0 | 1 | 3) || 1,
          budgetLimitAlerts: p.budgetLimitAlerts,
          budgetThresholdPercent: (p.budgetThresholdPercent as 80 | 85 | 90 | 100) || 85,
          invoiceDueAlerts: p.invoiceDueAlerts,
          createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar dados para despacho'
      return c.json({ error: 'Erro ao consultar dados para despacho', message }, 500)
    }
  }

  // Agrupa inscrições por usuário
  const userSubsMap = new Map<string, typeof allSubs>()
  for (const sub of allSubs) {
    const list = userSubsMap.get(sub.userId) || []
    list.push(sub)
    userSubsMap.set(sub.userId, list)
  }

  let processedUsers = 0
  let dispatchedAlerts = 0
  let expiredSubscriptionsPruned = 0
  const expiredIds: string[] = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  for (const [userId, subs] of userSubsMap.entries()) {
    processedUsers++
    const userPref = allPrefs.get(userId) || {
      id: 'default',
      userId,
      pushEnabled: true,
      billsDueAlerts: true,
      billsDueDaysBefore: 1 as const,
      budgetLimitAlerts: true,
      budgetThresholdPercent: 85 as const,
      invoiceDueAlerts: true,
      createdAt: new Date().toISOString(),
      updatedAt: null
    }

    if (!userPref.pushEnabled) {
      continue
    }

    const pendingAlerts: WebPushPayload[] = []

    // 1. Alertas de contas a vencer
    if (userPref.billsDueAlerts) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + userPref.billsDueDaysBefore)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      if (!db) {
        const userTxs = Array.from(mockTransactionsStore.values()).filter(
          (t) =>
            t.userId === userId &&
            t.type === 'expense' &&
            !t.paid &&
            t.dueDate &&
            t.dueDate >= todayStr &&
            t.dueDate <= targetDateStr
        )

        for (const tx of userTxs) {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(tx.dueDate!).getTime() - today.getTime()) / (1000 * 3600 * 24))
          )
          const daysText = daysLeft === 0 ? 'hoje' : daysLeft === 1 ? 'amanhã' : `em ${daysLeft} dias`
          pendingAlerts.push({
            title: `Conta a vencer ${daysText}!`,
            body: `${tx.description} no valor de R$ ${parseFloat(tx.amount).toFixed(2).replace('.', ',')} vence ${daysText}.`,
            icon: '/icon-192.png',
            badge: '/icon-light-32x32.png',
            data: { url: '/?open=transactions&status=pending', type: 'bill_due' }
          })
        }
      }
    }

    // 2. Alertas de limite de orçamento
    if (userPref.budgetLimitAlerts) {
      if (!db) {
        const userBudgets = Array.from(mockBudgetsStore.values()).filter((b) => b.userId === userId)
        for (const b of userBudgets) {
          // Calcula gastos na categoria no mês atual
          const currentMonthPrefix = todayStr.substring(0, 7)
          const categorySpent = Array.from(mockTransactionsStore.values())
            .filter(
              (t) =>
                t.userId === userId &&
                t.categoryId === b.categoryId &&
                t.type === 'expense' &&
                (t.occurredAt || t.createdAt).startsWith(currentMonthPrefix)
            )
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

          const limit = parseFloat(b.amountLimit) || 0
          if (limit > 0) {
            const percent = (categorySpent / limit) * 100
            if (percent >= userPref.budgetThresholdPercent) {
              pendingAlerts.push({
                title: 'Alerta de Orçamento!',
                body: `Você atingiu ${Math.round(percent)}% do limite planejado na categoria.`,
                icon: '/icon-192.png',
                badge: '/icon-light-32x32.png',
                data: { url: '/?open=budgets', type: 'budget_limit' }
              })
            }
          }
        }
      }
    }

    // 3. Alertas de faturas de cartão
    if (userPref.invoiceDueAlerts) {
      if (!db) {
        const userInvoices = Array.from(mockInvoicesStore.values()).filter(
          (inv) =>
            inv.userId === userId &&
            inv.status === 'open' &&
            inv.dueDate >= todayStr
        )
        for (const inv of userInvoices) {
          pendingAlerts.push({
            title: 'Fatura de Cartão Próxima do Vencimento',
            body: `Fatura no valor de R$ ${parseFloat(inv.amount || '0').toFixed(2).replace('.', ',')} com vencimento em ${inv.dueDate}.`,
            icon: '/icon-192.png',
            badge: '/icon-light-32x32.png',
            data: { url: '/?open=credit-cards', type: 'invoice_due' }
          })
        }
      }
    }

    // Dispara pushes para o usuário
    for (const alert of pendingAlerts) {
      for (const sub of subs) {
        const result = await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth
          },
          alert
        )

        if (result.success) {
          dispatchedAlerts++
        } else if (result.expired) {
          expiredIds.push(sub.id)
        }
      }
    }
  }

  // Limpeza de inscrições expiradas
  if (expiredIds.length > 0) {
    expiredSubscriptionsPruned = expiredIds.length
    if (!db) {
      for (const id of expiredIds) {
        mockPushSubscriptionsStore.delete(id)
      }
    } else {
      try {
        for (const id of expiredIds) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
        }
      } catch {
        // Tolerável em falha de limpeza
      }
    }
  }

  return c.json(
    {
      success: true,
      processedUsers,
      dispatchedAlerts,
      expiredSubscriptionsPruned
    },
    200
  )
})
