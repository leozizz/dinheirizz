CREATE TABLE IF NOT EXISTS "financial_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'personal' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_profiles_user_id_idx" ON "financial_profiles" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "financial_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can manage their own financial profiles"
  ON "financial_profiles"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"name" text NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"current_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"deadline" timestamp with time zone,
	"icon" text DEFAULT 'piggy-bank',
	"color" text DEFAULT '#7bc816',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "savings_goals_user_id_idx" ON "savings_goals" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "savings_goals_profile_id_idx" ON "savings_goals" USING btree ("profile_id");
--> statement-breakpoint
ALTER TABLE "savings_goals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can manage their own savings goals"
  ON "savings_goals"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "profile_id" uuid REFERENCES "public"."financial_profiles"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_profile_id_idx" ON "accounts" USING btree ("profile_id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "profile_id" uuid REFERENCES "public"."financial_profiles"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_profile_id_idx" ON "transactions" USING btree ("profile_id");
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "profile_id" uuid REFERENCES "public"."financial_profiles"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_profile_id_idx" ON "budgets" USING btree ("profile_id");
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN IF NOT EXISTS "profile_id" uuid REFERENCES "public"."financial_profiles"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_cards_profile_id_idx" ON "credit_cards" USING btree ("profile_id");
--> statement-breakpoint
-- Backfill idempotente: cria perfil padrão "Pessoal" para usuários existentes sem perfil
INSERT INTO "financial_profiles" ("user_id", "name", "type", "currency", "is_default")
SELECT u."id", 'Pessoal', 'personal', 'BRL', true
FROM "public"."users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "financial_profiles" fp WHERE fp."user_id" = u."id"
);
--> statement-breakpoint
UPDATE "accounts" a
SET "profile_id" = (
  SELECT fp."id" FROM "financial_profiles" fp
  WHERE fp."user_id" = a."user_id"
  ORDER BY fp."is_default" DESC, fp."created_at" ASC
  LIMIT 1
)
WHERE a."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "transactions" t
SET "profile_id" = (
  SELECT fp."id" FROM "financial_profiles" fp
  WHERE fp."user_id" = t."user_id"
  ORDER BY fp."is_default" DESC, fp."created_at" ASC
  LIMIT 1
)
WHERE t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "budgets" b
SET "profile_id" = (
  SELECT fp."id" FROM "financial_profiles" fp
  WHERE fp."user_id" = b."user_id"
  ORDER BY fp."is_default" DESC, fp."created_at" ASC
  LIMIT 1
)
WHERE b."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "credit_cards" c
SET "profile_id" = (
  SELECT fp."id" FROM "financial_profiles" fp
  WHERE fp."user_id" = c."user_id"
  ORDER BY fp."is_default" DESC, fp."created_at" ASC
  LIMIT 1
)
WHERE c."profile_id" IS NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "budgets_user_category_period_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_category_period_idx" ON "budgets" USING btree ("user_id","profile_id","category_id","period");
