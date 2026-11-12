import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não configurada no ambiente.')
  process.exit(1)
}
const sql = postgres(url, { max: 1 })

const check = async () => {
  try {
    console.log('--- Verificando Migrações e Esquema no Banco de Dados ---')
    
    // 1. Verificar tabela de migrações do drizzle
    const hasDrizzleSchema = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'
      ) as exists;
    `
    console.log('Schema drizzle existe:', hasDrizzleSchema[0].exists)

    if (hasDrizzleSchema[0].exists) {
      const reg = await sql`SELECT to_regclass('drizzle.__drizzle_migrations') as reg;`
      if (reg[0].reg) {
        const migrations = await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC;`
        console.log('Migrações registradas em drizzle.__drizzle_migrations:', migrations)
      } else {
        console.log('Tabela drizzle.__drizzle_migrations NÃO encontrada.')
      }
    }

    // 2. Listar tabelas do schema public
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
    console.log('\nTabelas encontradas no public schema:')
    console.log(tables.map(t => t.table_name).join(', '))

    // 3. Checar colunas importantes de cada tabela do schema
    const checkColumns = async (table) => {
      const cols = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${table}
        ORDER BY ordinal_position;
      `
      return cols.map(c => c.column_name)
    }

    const expectedTables = [
      'users',
      'accounts',
      'categories',
      'transactions',
      'transfers',
      'pix_keys',
      'insights',
      'user_ai_settings',
      'budgets',
      'verification_tokens'
    ]

    console.log('\n--- Detalhamento por Tabela Esperada ---')
    for (const t of expectedTables) {
      const exists = tables.some(x => x.table_name === t)
      if (exists) {
        const cols = await checkColumns(t)
        console.log(`[OK] Tabela "${t}" existe com ${cols.length} colunas: ${cols.join(', ')}`)
      } else {
        console.log(`[ALERTA] Tabela "${t}" NÃO EXISTE no banco de dados!`)
      }
    }

    // 4. Checar arquivos de migração locais em drizzle/
    console.log('\n--- Arquivos de migração locais em drizzle/ ---')
    const files = fs.readdirSync('drizzle').filter(f => f.endsWith('.sql'))
    console.log(files)

  } catch (err) {
    console.error('Erro na checagem:', err)
  } finally {
    await sql.end()
  }
}

check()
