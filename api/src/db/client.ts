import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { getRuntimeEnv } from '../lib/env'

let client: postgres.Sql | null = null
let clientUrl: string | null = null

export const getDb = (connectionString?: string) => {
  const runtimeEnv = getRuntimeEnv()
  const url = connectionString || runtimeEnv?.DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    return null
  }
  if (!client || clientUrl !== url) {
    client = postgres(url, { max: 1 })
    clientUrl = url
  }
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof drizzle<typeof schema>>
