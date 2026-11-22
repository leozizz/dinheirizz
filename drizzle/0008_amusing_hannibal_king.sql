CREATE TABLE "financial_profiles" (
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
CREATE TABLE "mcp_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_finance_account_links" (
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
CREATE TABLE "open_finance_connections" (
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
CREATE TABLE "personal_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY['read:accounts','read:transactions','read:forecast','read:budgets','read:invoices']::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
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
CREATE TABLE "subscription_ignores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"normalized_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "budgets_user_category_period_idx";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_token_id_personal_api_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."personal_api_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_connection_id_open_finance_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."open_finance_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_account_links" ADD CONSTRAINT "open_finance_account_links_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_api_tokens" ADD CONSTRAINT "personal_api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_ignores" ADD CONSTRAINT "subscription_ignores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_profiles_user_id_idx" ON "financial_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_audit_logs_user_id_idx" ON "mcp_audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "open_finance_account_links_user_id_idx" ON "open_finance_account_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "open_finance_account_links_conn_ext_uidx" ON "open_finance_account_links" USING btree ("connection_id","external_account_id");--> statement-breakpoint
CREATE INDEX "open_finance_connections_user_id_idx" ON "open_finance_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "open_finance_connections_provider_item_uidx" ON "open_finance_connections" USING btree ("provider","external_item_id");--> statement-breakpoint
CREATE INDEX "personal_api_tokens_user_id_idx" ON "personal_api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_api_tokens_hash_uidx" ON "personal_api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "savings_goals_user_id_idx" ON "savings_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_goals_profile_id_idx" ON "savings_goals" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "subscription_ignores_user_id_idx" ON "subscription_ignores" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_ignores_user_key_unique" ON "subscription_ignores" USING btree ("user_id","normalized_key");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_profile_id_financial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."financial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_profile_id_idx" ON "accounts" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "budgets_profile_id_idx" ON "budgets" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "credit_cards_profile_id_idx" ON "credit_cards" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "transactions_profile_id_idx" ON "transactions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "transactions_user_external_id_idx" ON "transactions" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_period_idx" ON "budgets" USING btree ("user_id","profile_id","category_id","period");