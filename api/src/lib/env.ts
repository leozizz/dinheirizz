import { AsyncLocalStorage } from 'node:async_hooks'
import type postgres from 'postgres'

export interface RuntimeEnv {
  DATABASE_URL?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  JWT_SECRET?: string
  SUPABASE_JWT_SECRET?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  ENVIRONMENT?: string
  NODE_ENV?: string
}

export interface RequestContextStore {
  env: RuntimeEnv
  dbClient?: postgres.Sql
  dbClientUrl?: string
}

const runtimeEnvStorage = new AsyncLocalStorage<RequestContextStore>()

export const runWithRuntimeEnv = <T>(
  env: RuntimeEnv | undefined,
  fn: () => Promise<T>
): Promise<T> => {
  return runtimeEnvStorage.run({ env: env ?? {} }, fn)
}

export const getRuntimeEnv = (): RuntimeEnv | undefined => {
  return runtimeEnvStorage.getStore()?.env
}

export const getRequestDbStore = (): RequestContextStore | undefined => {
  return runtimeEnvStorage.getStore()
}

export const setRequestDbClient = (client: postgres.Sql, url: string): void => {
  const store = runtimeEnvStorage.getStore()
  if (store) {
    store.dbClient = client
    store.dbClientUrl = url
  }
}

export const clearRequestDbClient = (): void => {
  const store = runtimeEnvStorage.getStore()
  if (store) {
    store.dbClient = undefined
    store.dbClientUrl = undefined
  }
}

export const isProductionEnv = (env?: Partial<RuntimeEnv>): boolean => {
  const storeEnv = getRuntimeEnv()
  const environment = env?.ENVIRONMENT ?? storeEnv?.ENVIRONMENT ?? process.env.ENVIRONMENT
  const nodeEnv = env?.NODE_ENV ?? storeEnv?.NODE_ENV ?? process.env.NODE_ENV
  return environment === 'production' || nodeEnv === 'production'
}
