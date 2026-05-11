import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_ANON_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!SUPABASE_SERVICE_ROLE) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
})

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
})

export interface CategoryRecord {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income' | string
  created_at: string
}

export interface TransactionRecord {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  occurred_at: string
  amount: string
  description: string | null
  paid: boolean
  created_at: string
  categories?: CategoryRecord | null
}

export interface TransactionInput {
  id?: string
  account_id: string
  category_id?: string | null
  occurred_at?: string | Date
  amount: number
  description?: string | null
  paid?: boolean
}

const transactionInputSchema = z.object({
  id: z.string().uuid().optional(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  occurred_at: z.union([z.string(), z.date()]).optional(),
  amount: z.number().positive(),
  description: z.string().trim().min(1).max(500).nullable().optional(),
  paid: z.boolean().optional()
})

export async function getTransactions(
  userId: string,
  opts?: { limit?: number; offset?: number; month?: number; year?: number }
) {
  const limit = Number.isInteger(opts?.limit) && (opts?.limit ?? 0) > 0 ? Math.min(opts?.limit ?? 20, 100) : 20
  const offset = Number.isInteger(opts?.offset) && (opts?.offset ?? 0) >= 0 ? opts?.offset ?? 0 : 0

  let query = supabaseAdmin
    .from('transactions')
    .select('id,user_id,account_id,category_id,occurred_at,amount,description,paid,created_at,categories(id,name,type,created_at,user_id)')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })

  if (opts?.month && opts?.year) {
    const month = Number(opts.month)
    const year = Number(opts.year)
    const start = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const end = `${nextYear.toString().padStart(4, '0')}-${nextMonth.toString().padStart(2, '0')}-01`
    query = query.gte('occurred_at', start).lt('occurred_at', end)
  }

  const from = offset
  const to = offset + limit - 1

  const { data, error } = await query.range(from, to)
  return { data: data as TransactionRecord[] | null, error }
}

export async function upsertTransaction(userId: string, input: TransactionInput) {
  const parsedInput = transactionInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return { data: null, error: parsedInput.error }
  }

  const validInput = parsedInput.data

  const payload = {
    account_id: validInput.account_id,
    category_id: validInput.category_id ?? null,
    occurred_at:
      typeof validInput.occurred_at === 'string'
        ? validInput.occurred_at
        : validInput.occurred_at instanceof Date
          ? validInput.occurred_at.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
    amount: validInput.amount,
    description: validInput.description ?? null,
    paid: typeof validInput.paid === 'boolean' ? validInput.paid : true,
    user_id: userId
  }

  if (validInput.id) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update(payload)
      .match({ id: validInput.id, user_id: userId })
      .select()
      .single()
    return { data, error }
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}

export async function deleteTransaction(userId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    return { data: null, error: new Error('Invalid id') }
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .match({ id, user_id: userId })
    .select()
    .single()

  return { data, error }
}

export async function getCategories(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id,user_id,name,type,created_at')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  return { data: data as CategoryRecord[] | null, error }
}
