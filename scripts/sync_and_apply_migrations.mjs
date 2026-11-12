import fs from 'fs'
import crypto from 'crypto'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não configurada no ambiente.')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
const db = drizzle(sql)

const run = async () => {
  try {
    console.log('=== Início da Sincronização e Aplicação de Migrações Drizzle ===\n')

    // 1. Garantir que a tabela drizzle.__drizzle_migrations existe
    await sql`CREATE SCHEMA IF NOT EXISTS "drizzle";`
    await sql`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `

    // 2. Carregar o _journal.json
    const journalPath = './drizzle/meta/_journal.json'
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'))

    // 3. Obter migrações já registradas no banco
    const existingRecords = await sql`
      SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at ASC;
    `
    const existingTimes = new Set(existingRecords.map(r => String(r.created_at)))

    console.log(`Migrações já registradas no banco: ${existingRecords.length}`)

    // 4. Inserir migrações 0 a 5 que já estão no banco mas não estavam no histórico
    // (idx 0 a 5 são: 0000, 0001, 0002, 0003, 0004, 0005)
    for (const entry of journal.entries) {
      if (entry.idx < 6) {
        if (!existingTimes.has(String(entry.when))) {
          const sqlFile = `./drizzle/${entry.tag}.sql`
          const content = fs.readFileSync(sqlFile, 'utf8')
          const hash = crypto.createHash('sha256').update(content).digest('hex')

          console.log(`Registrando migração baseline [${entry.tag}] (timestamp: ${entry.when})...`)
          await sql`
            INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
            VALUES (${hash}, ${entry.when});
          `
        }
      }
    }

    console.log('\nExecutando migrate() oficial do Drizzle ORM...')
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migrações aplicadas com sucesso pelo Drizzle ORM!')

    // 5. Validação das tabelas e colunas
    console.log('\n=== Validação Pós-Migração ===')
    const finalRecords = await sql`
      SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at ASC;
    `
    console.log(`Total de migrações registradas: ${finalRecords.length}`)
    for (const rec of finalRecords) {
      console.log(` - ID ${rec.id}: created_at=${rec.created_at}`)
    }

    const budgetsCheck = await sql`SELECT to_regclass('public.budgets') as exists;`
    const tokensCheck = await sql`SELECT to_regclass('public.verification_tokens') as exists;`
    const userEmailVerifiedCheck = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified';
    `

    console.log(`\nVerificação final de integridade:`)
    console.log(`- Tabela public.budgets: ${budgetsCheck[0]?.exists ? 'OK' : 'FALHA'}`)
    console.log(`- Tabela public.verification_tokens: ${tokensCheck[0]?.exists ? 'OK' : 'FALHA'}`)
    console.log(`- Coluna users.email_verified: ${userEmailVerifiedCheck.length > 0 ? 'OK' : 'FALHA'}`)

  } catch (err) {
    console.error('Erro durante a execução das migrações:', err)
    process.exitCode = 1
  } finally {
    await sql.end()
  }
}

run()
