import postgres from 'postgres'

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function apply() {
  try {
    console.log('--- Aplicando migração para Issue #29 (transactions: due_date, status, etc) ---')

    await sql`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'completed' NOT NULL,
      ADD COLUMN IF NOT EXISTS "is_recurring" boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS "recurrence_period" text,
      ADD COLUMN IF NOT EXISTS "installment_current" integer,
      ADD COLUMN IF NOT EXISTS "installment_total" integer,
      ADD COLUMN IF NOT EXISTS "parent_transaction_id" uuid REFERENCES "public"."transactions"("id") ON DELETE SET NULL;
    `
    console.log('Colunas de transactions adicionadas com sucesso!')

    // Sincroniza retrocompatibilidade de transações existentes
    await sql`
      UPDATE "transactions"
      SET "status" = 'pending'
      WHERE "paid" = false AND ("status" IS NULL OR "status" = 'completed');
    `
    console.log('Retrocompatibilidade de status sincronizada!')

    // Verifica colunas existentes na tabela transactions
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `
    console.log('Estrutura atual da tabela transactions:')
    for (const c of columns) {
      console.log(` - ${c.column_name} (${c.data_type}) [default: ${c.column_default}]`)
    }

    // Testa query SELECT id, amount, status FROM transactions LIMIT 5
    const sample = await sql`SELECT id, amount, paid, status, due_date FROM transactions LIMIT 5`
    console.log('Amostra de transações lidas do banco:', sample)

  } catch (e) {
    console.error('Erro na migração:', e)
  } finally {
    await sql.end()
  }
}

apply()
