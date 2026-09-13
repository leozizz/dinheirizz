import postgres from 'postgres'

const url = process.env.DATABASE_URL || 'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function clean() {
  try {
    console.log('Limpando dados de teste do banco...')
    // Limpar tabelas da aplicação
    await sql`TRUNCATE TABLE transactions, accounts, categories, pix_keys, users CASCADE`
    console.log('Tabelas public.* limpas com sucesso.')

    // Limpar auth.users
    const deletedAuth = await sql`DELETE FROM auth.users RETURNING id, email`
    console.log(`auth.users limpo com sucesso: ${deletedAuth.length} usuário(s) removido(s).`, deletedAuth)
  } catch (e) {
    console.error('Erro ao limpar banco:', e.message)
  } finally {
    await sql.end()
  }
}
clean()
