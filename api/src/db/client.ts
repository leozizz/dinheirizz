import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let client: postgres.Sql | null = null

export function getDb(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL
  if (!url) {
    return null
  }
  if (!client) {
    client = postgres(url, { max: 1 })
  }
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof drizzle<typeof schema>>
