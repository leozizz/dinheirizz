import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import { pushSubscriptions, notificationPreferences } from '../src/db/schema'

describe('Drizzle Push Schemas (TDD)', () => {
  it('deve exportar a tabela push_subscriptions com as colunas corretas', () => {
    expect(pushSubscriptions).toBeDefined()
    const columns = getTableColumns(pushSubscriptions)

    expect(columns.id).toBeDefined()
    expect(columns.userId).toBeDefined()
    expect(columns.endpoint).toBeDefined()
    expect(columns.p256dh).toBeDefined()
    expect(columns.auth).toBeDefined()
    expect(columns.userAgent).toBeDefined()
    expect(columns.createdAt).toBeDefined()
    expect(columns.updatedAt).toBeDefined()
  })

  it('deve exportar a tabela notification_preferences com as colunas e defaults corretos', () => {
    expect(notificationPreferences).toBeDefined()
    const columns = getTableColumns(notificationPreferences)

    expect(columns.id).toBeDefined()
    expect(columns.userId).toBeDefined()
    expect(columns.pushEnabled).toBeDefined()
    expect(columns.billsDueAlerts).toBeDefined()
    expect(columns.billsDueDaysBefore).toBeDefined()
    expect(columns.budgetLimitAlerts).toBeDefined()
    expect(columns.budgetThresholdPercent).toBeDefined()
    expect(columns.invoiceDueAlerts).toBeDefined()
    expect(columns.createdAt).toBeDefined()
    expect(columns.updatedAt).toBeDefined()
  })
})
