import { pgTable, uuid, text, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
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
