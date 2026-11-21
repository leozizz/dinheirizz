CREATE TABLE IF NOT EXISTS "open_finance_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"provider" text NOT NULL,
	"external_item_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_logo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"consent_scope" text DEFAULT 'read_only' NOT NULL,
	"consent_expires_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "open_finance_connections_user_id_idx" ON "open_finance_connections" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "open_finance_connections_provider_item_uidx" ON "open_finance_connections" USING btree ("provider","external_item_id");
--> statement-breakpoint
ALTER TABLE "open_finance_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can manage their own open finance connections"
  ON "open_finance_connections"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "open_finance_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"external_account_id" text NOT NULL,
	"external_account_type" text NOT NULL,
	"external_account_name" text NOT NULL,
	"account_id" uuid,
	"credit_card_id" uuid,
	"last_balance" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_connection_id_open_finance_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."open_finance_connections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "open_finance_account_links_user_id_idx" ON "open_finance_account_links" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "open_finance_account_links_conn_ext_uidx" ON "open_finance_account_links" USING btree ("connection_id","external_account_id");
--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can manage their own open finance account links"
  ON "open_finance_account_links"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "external_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_external_id_idx" ON "transactions" USING btree ("user_id","external_id");
