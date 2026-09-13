import postgres from 'postgres'

const url = process.env.DATABASE_URL || 'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function check() {
  try {
    const authUsers = await sql`SELECT id, email, created_at FROM auth.users`
    console.log('auth.users count:', authUsers.length, authUsers)
    const pubUsers = await sql`SELECT id, email, created_at FROM public.users`
    console.log('public.users count:', pubUsers.length, pubUsers)
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await sql.end()
  }
}
check()
