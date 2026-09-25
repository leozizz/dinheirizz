import { pgTable, uuid, text, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  username: text('username').unique(),
  avatarUrl: text('avatar_url'),
  provider: text('provider').default('email'),
  providers: text('providers').array().default(sql`ARRAY['email']::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: text('type').default('checking').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'expense' | 'income'
  icon: text('icon'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  paid: boolean('paid').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const pixKeys = pgTable('pix_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  keyType: text('key_type').notNull(), // 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  keyValue: text('key_value').notNull(),
  bankName: text('bank_name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const insights = pgTable('insights', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

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
