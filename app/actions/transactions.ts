'use server'

import {
  getTransactions,
  getCategories,
  upsertTransaction,
  deleteTransaction,
  type TransactionInput
} from '@/lib/supabase'

export async function serverGetTransactions(userId: string, opts?: { limit?: number; offset?: number; month?: number; year?: number }) {
  return getTransactions(userId, opts)
}

export async function serverGetCategories(userId: string) {
  return getCategories(userId)
}

export async function serverUpsertTransaction(userId: string, input: TransactionInput) {
  return upsertTransaction(userId, input)
}

export async function serverDeleteTransaction(userId: string, id: string) {
  return deleteTransaction(userId, id)
}
