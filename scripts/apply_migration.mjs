import fs from 'fs'
import postgres from 'postgres'

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function apply() {
  try {
    const migration = fs.readFileSync('drizzle/0002_create_insights_table.sql', 'utf8')
    console.log('Aplicando migração drizzle/0002_create_insights_table.sql...')
    await sql.unsafe(migration)
    console.log('Migração executada com sucesso!')

    const res = await sql`SELECT to_regclass('public.insights') as exists`
    console.log('Verificação: public.insights table exists:', res[0].exists)
  } catch (e) {
    console.error('Erro ao aplicar migração:', e.message)
  } finally {
    await sql.end()
  }
}

apply()
