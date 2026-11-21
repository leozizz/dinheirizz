import { pgTable, uuid, text, numeric, timestamp, boolean, integer, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  username: text('username').unique(),
  avatarUrl: text('avatar_url'),
  provider: text('provider').default('email'),
  providers: text('providers').array().default(sql`ARRAY['email']::text[]`),
  role: text('role').default('free').notNull(), // 'free' | 'pro' | 'admin'
  proType: text('pro_type'), // 'subscriber' | 'invited'
  proExpiresAt: timestamp('pro_expires_at', { withTimezone: true }),
  invitedBy: uuid('invited_by'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const financialProfiles = pgTable(
  'financial_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    type: text('type').default('personal').notNull(), // 'personal' | 'business'
    currency: text('currency').default('BRL').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('financial_profiles_user_id_idx').on(table.userId)
  ]
)

export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    targetAmount: numeric('target_amount', { precision: 12, scale: 2 }).notNull(),
    currentAmount: numeric('current_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    deadline: timestamp('deadline', { withTimezone: true }),
    icon: text('icon').default('piggy-bank'),
    color: text('color').default('#7bc816'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('savings_goals_user_id_idx').on(table.userId),
    index('savings_goals_profile_id_idx').on(table.profileId)
  ]
)

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    type: text('type').default('checking').notNull(),
    balance: numeric('balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    index('accounts_profile_id_idx').on(table.profileId)
  ]
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'expense' | 'income'
    icon: text('icon'),
    color: text('color'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId)
  ]
)

export const creditCards = pgTable(
  'credit_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    brand: text('brand').default('mastercard').notNull(),
    limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }).notNull(),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    color: text('color').default('#7bc816'),
    lastFourDigits: text('last_four_digits'),
    archived: boolean('archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('credit_cards_user_id_idx').on(table.userId),
    index('credit_cards_profile_id_idx').on(table.profileId),
    index('credit_cards_account_id_idx').on(table.accountId)
  ]
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    creditCardId: uuid('credit_card_id').references(() => creditCards.id, { onDelete: 'set null' }),
    invoiceId: uuid('invoice_id').references((): AnyPgColumn => invoices.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    description: text('description'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paid: boolean('paid').default(true).notNull(),
    status: text('status').default('completed').notNull(), // 'completed' | 'pending' | 'cancelled'
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrencePeriod: text('recurrence_period'), // 'daily' | 'weekly' | 'monthly' | 'yearly' | null
    recurrenceDay: integer('recurrence_day'),
    adjustBusinessDay: boolean('adjust_business_day').default(false).notNull(),
    installmentCurrent: integer('installment_current'),
    installmentTotal: integer('installment_total'),
    parentTransactionId: uuid('parent_transaction_id'),
    externalId: text('external_id'),
    source: text('source').default('manual').notNull(), // 'manual' | 'import' | 'open_finance'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_profile_id_idx').on(table.profileId),
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_category_id_idx').on(table.categoryId),
    index('transactions_credit_card_id_idx').on(table.creditCardId),
    index('transactions_invoice_id_idx').on(table.invoiceId),
    index('transactions_user_occurred_idx').on(table.userId, table.occurredAt),
    index('transactions_user_due_date_idx').on(table.userId, table.dueDate),
    index('transactions_user_status_idx').on(table.userId, table.status),
    index('transactions_user_external_id_idx').on(table.userId, table.externalId)
  ]
)

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creditCardId: uuid('credit_card_id').references(() => creditCards.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    period: text('period').notNull(), // 'YYYY-MM'
    closingDate: timestamp('closing_date', { withTimezone: true }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    status: text('status').default('open').notNull(), // 'open' | 'closed' | 'paid' | 'overdue'
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paymentAccountId: uuid('payment_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    paymentTransactionId: uuid('payment_transaction_id').references((): AnyPgColumn => transactions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('invoices_card_id_idx').on(table.creditCardId),
    index('invoices_user_period_idx').on(table.userId, table.period),
    uniqueIndex('invoices_card_period_unique').on(table.creditCardId, table.period)
  ]
)

export const pixKeys = pgTable(
  'pix_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    keyType: text('key_type').notNull(), // 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
    keyValue: text('key_value').notNull(),
    bankName: text('bank_name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('pix_keys_user_id_idx').on(table.userId)
  ]
)

export const insights = pgTable(
  'insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    period: text('period').notNull(), // 'YYYY-MM'
    summary: text('summary').notNull(),
    financialHealthScore: numeric('financial_health_score', { precision: 5, scale: 2 }).notNull(),
    highlights: text('highlights').array().default(sql`ARRAY[]::text[]`),
    alerts: text('alerts').array().default(sql`ARRAY[]::text[]`),
    recommendations: text('recommendations').array().default(sql`ARRAY[]::text[]`),
    metricsSnapshot: text('metrics_snapshot'),
    isFallback: boolean('is_fallback').default(false).notNull(),
    source: text('source').default('fallback').notNull(), // 'byok' | 'system' | 'fallback'
    provider: text('provider').default('gemini'),
    modelName: text('model_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('insights_user_period_idx').on(table.userId, table.period)
  ]
)

export const userAiSettings = pgTable('user_ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  provider: text('provider').default('gemini').notNull(), // 'gemini' | 'openai' | 'groq'
  apiKeyEncrypted: text('api_key_encrypted'),
  customModel: text('custom_model'),
  isValidated: boolean('is_validated').default(false).notNull(),
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
    amountLimit: numeric('amount_limit', { precision: 12, scale: 2 }).notNull(),
    period: text('period').default('monthly').notNull(), // 'YYYY-MM' ou 'monthly'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('budgets_user_id_idx').on(table.userId),
    index('budgets_profile_id_idx').on(table.profileId),
    uniqueIndex('budgets_user_category_period_idx').on(table.userId, table.profileId, table.categoryId, table.period)
  ]
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    token: text('token').notNull(),
    type: text('type').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('verification_tokens_email_idx').on(table.email),
    index('verification_tokens_token_idx').on(table.token)
  ]
)

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('push_subscriptions_user_id_idx').on(table.userId),
    index('push_subscriptions_endpoint_idx').on(table.endpoint)
  ]
)

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),
    billsDueAlerts: boolean('bills_due_alerts').default(true).notNull(),
    billsDueDaysBefore: integer('bills_due_days_before').default(1).notNull(),
    budgetLimitAlerts: boolean('budget_limit_alerts').default(true).notNull(),
    budgetThresholdPercent: integer('budget_threshold_percent').default(85).notNull(),
    invoiceDueAlerts: boolean('invoice_due_alerts').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('notification_preferences_user_id_idx').on(table.userId)
  ]
)

export const subscriptionIgnores = pgTable(
  'subscription_ignores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    normalizedKey: text('normalized_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('subscription_ignores_user_id_idx').on(table.userId),
    uniqueIndex('subscription_ignores_user_key_unique').on(table.userId, table.normalizedKey)
  ]
)

export const openFinanceConnections = pgTable(
  'open_finance_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profileId: uuid('profile_id').references(() => financialProfiles.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(), // 'pluggy' | 'belvo' | 'sandbox'
    externalItemId: text('external_item_id').notNull(),
    institutionId: text('institution_id').notNull(),
    institutionName: text('institution_name').notNull(),
    institutionLogoUrl: text('institution_logo_url'),
    status: text('status').default('active').notNull(), // 'active' | 'updating' | 'login_error' | 'outdated' | 'revoked'
    consentScope: text('consent_scope').default('read_only').notNull(),
    consentExpiresAt: timestamp('consent_expires_at', { withTimezone: true }),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('open_finance_connections_user_id_idx').on(table.userId),
    uniqueIndex('open_finance_connections_provider_item_uidx').on(table.provider, table.externalItemId)
  ]
)

export const openFinanceAccountLinks = pgTable(
  'open_finance_account_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id').references(() => openFinanceConnections.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    externalAccountId: text('external_account_id').notNull(),
    externalAccountType: text('external_account_type').notNull(), // 'BANK' | 'CREDIT'
    externalAccountName: text('external_account_name').notNull(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    creditCardId: uuid('credit_card_id').references(() => creditCards.id, { onDelete: 'set null' }),
    lastBalance: numeric('last_balance', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    index('open_finance_account_links_user_id_idx').on(table.userId),
    uniqueIndex('open_finance_account_links_conn_ext_uidx').on(table.connectionId, table.externalAccountId)
  ]
)

export const personalApiTokens = pgTable(
  'personal_api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    scopes: text('scopes')
      .array()
      .default(sql`ARRAY['read:accounts','read:transactions','read:forecast','read:budgets','read:invoices']::text[]`)
      .notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('personal_api_tokens_user_id_idx').on(table.userId),
    uniqueIndex('personal_api_tokens_hash_uidx').on(table.tokenHash)
  ]
)

export const mcpAuditLogs = pgTable(
  'mcp_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenId: uuid('token_id').references(() => personalApiTokens.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    toolName: text('tool_name').notNull(),
    status: text('status').notNull(), // 'success' | 'forbidden' | 'error'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('mcp_audit_logs_user_id_idx').on(table.userId, table.createdAt)
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export type PixKey = typeof pixKeys.$inferSelect
export type NewPixKey = typeof pixKeys.$inferInsert

export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert

export type UserAiSetting = typeof userAiSettings.$inferSelect
export type NewUserAiSetting = typeof userAiSettings.$inferInsert

export type Budget = typeof budgets.$inferSelect
export type NewBudget = typeof budgets.$inferInsert

export type CreditCard = typeof creditCards.$inferSelect
export type NewCreditCard = typeof creditCards.$inferInsert

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

export type VerificationToken = typeof verificationTokens.$inferSelect
export type NewVerificationToken = typeof verificationTokens.$inferInsert

export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert

export type NotificationPreference = typeof notificationPreferences.$inferSelect
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert

export type SubscriptionIgnore = typeof subscriptionIgnores.$inferSelect
export type NewSubscriptionIgnore = typeof subscriptionIgnores.$inferInsert

export type FinancialProfile = typeof financialProfiles.$inferSelect
export type NewFinancialProfile = typeof financialProfiles.$inferInsert

export type SavingsGoal = typeof savingsGoals.$inferSelect
export type NewSavingsGoal = typeof savingsGoals.$inferInsert

export type OpenFinanceConnection = typeof openFinanceConnections.$inferSelect
export type NewOpenFinanceConnection = typeof openFinanceConnections.$inferInsert

export type OpenFinanceAccountLink = typeof openFinanceAccountLinks.$inferSelect
export type NewOpenFinanceAccountLink = typeof openFinanceAccountLinks.$inferInsert

export type PersonalApiToken = typeof personalApiTokens.$inferSelect
export type NewPersonalApiToken = typeof personalApiTokens.$inferInsert

export type McpAuditLog = typeof mcpAuditLogs.$inferSelect
export type NewMcpAuditLog = typeof mcpAuditLogs.$inferInsert


