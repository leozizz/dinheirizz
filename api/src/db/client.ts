import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import {
  clearRequestDbClient,
  getRequestDbStore,
  getRuntimeEnv,
  setRequestDbClient
} from '../lib/env'

export type Database = ReturnType<typeof drizzle<typeof schema>>

export const getDb = (connectionString?: string): Database | null => {
  const runtimeEnv = getRuntimeEnv()
  const url = connectionString || runtimeEnv?.DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    return null
  }

  const store = getRequestDbStore()
  if (store) {
    if (!store.dbClient || store.dbClientUrl !== url) {
      if (store.dbClient) {
        void store.dbClient.end({ timeout: 5 }).catch(() => undefined)
      }
      const requestClient = postgres(url, { max: 1, prepare: false })
      setRequestDbClient(requestClient, url)
      return drizzle(requestClient, { schema })
    }
    return drizzle(store.dbClient, { schema })
  }

  const standaloneClient = postgres(url, { max: 1, prepare: false })
  return drizzle(standaloneClient, { schema })
}

export const closeRequestDb = async (): Promise<void> => {
  const store = getRequestDbStore()
  const client = store?.dbClient
  if (!client) {
    return
  }

  clearRequestDbClient()
  try {
    await client.end({ timeout: 5 })
  } catch (error) {
    // Evita que falhas ao fechar socket já encerrado mascarem a resposta HTTP
    void error
  }
}
