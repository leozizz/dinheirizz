import { AsyncLocalStorage } from 'node:async_hooks'

export interface RuntimeEnv {
  DATABASE_URL?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  JWT_SECRET?: string
  SUPABASE_JWT_SECRET?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  ENVIRONMENT?: string
  NODE_ENV?: string
}

const runtimeEnvStorage = new AsyncLocalStorage<RuntimeEnv>()

export const runWithRuntimeEnv = <T>(
  env: RuntimeEnv | undefined,
  fn: () => Promise<T>
): Promise<T> => {
  return runtimeEnvStorage.run(env ?? {}, fn)
}

export const getRuntimeEnv = (): RuntimeEnv | undefined => {
  return runtimeEnvStorage.getStore()
}

export const isProductionEnv = (env?: Partial<RuntimeEnv>): boolean => {
  const storeEnv = getRuntimeEnv()
  const environment = env?.ENVIRONMENT ?? storeEnv?.ENVIRONMENT ?? process.env.ENVIRONMENT
  const nodeEnv = env?.NODE_ENV ?? storeEnv?.NODE_ENV ?? process.env.NODE_ENV
  return environment === 'production' || nodeEnv === 'production'
}
