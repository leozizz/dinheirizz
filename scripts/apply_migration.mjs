import fs from 'fs'
import postgres from 'postgres'

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres.wkglkyxqbhlrnodgdscf:Dinh31r155@2K26@L30z15z@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
const sql = postgres(url, { max: 1 })

async function apply() {
  try {
    console.log('--- Executando migrações unificadas do Dinheirizz ---')

    // 1. Migração 0003_byok_and_roles
    if (fs.existsSync('drizzle/0003_byok_and_roles.sql')) {
      const migration = fs.readFileSync('drizzle/0003_byok_and_roles.sql', 'utf8')
      console.log('Aplicando migração drizzle/0003_byok_and_roles.sql...')
      await sql.unsafe(migration)
      console.log('Migração 0003 executada!')
    }

    // 2. Colunas de recorrência, status e parcelamento (Issue #29)
    console.log('Garantindo colunas de recorrência e vencimento em transactions...')
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
    await sql`
      UPDATE "transactions"
      SET "status" = 'pending'
      WHERE "paid" = false AND ("status" IS NULL OR "status" = 'completed');
    `
    console.log('Colunas de transactions garantidas com sucesso!')

    const res = await sql`SELECT to_regclass('public.user_ai_settings') as exists`
    console.log('Verificação: public.user_ai_settings exists:', res[0]?.exists)
  } catch (e) {
    console.error('Erro ao aplicar migração:', e.message)
  } finally {
    await sql.end()
  }
}

apply()
