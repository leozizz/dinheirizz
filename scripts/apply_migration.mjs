import fs from 'fs'
import postgres from 'postgres'

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function apply() {
  try {
    const migration = fs.readFileSync('drizzle/0003_byok_and_roles.sql', 'utf8')
    console.log('Aplicando migração drizzle/0003_byok_and_roles.sql...')
    await sql.unsafe(migration)
    console.log('Migração 0003 executada com sucesso!')

    const res = await sql`SELECT to_regclass('public.user_ai_settings') as exists`
    console.log('Verificação: public.user_ai_settings table exists:', res[0].exists)

    const columnsUsers = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('role', 'pro_type', 'pro_expires_at', 'invited_by')
    `
    console.log('Colunas adicionadas em users:', columnsUsers.map(c => c.column_name))

    const columnsInsights = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'insights' AND column_name IN ('source', 'provider', 'model_name')
    `
    console.log('Colunas adicionadas em insights:', columnsInsights.map(c => c.column_name))
  } catch (e) {
    console.error('Erro ao aplicar migração:', e.message)
  } finally {
    await sql.end()
  }
}

apply()
