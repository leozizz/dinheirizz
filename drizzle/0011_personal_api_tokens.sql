CREATE TABLE IF NOT EXISTS "personal_api_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "token_prefix" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "scopes" text[] DEFAULT ARRAY['read:accounts','read:transactions','read:forecast','read:budgets','read:invoices']::text[] NOT NULL,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "personal_api_tokens_user_id_idx" ON "personal_api_tokens" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "personal_api_tokens_hash_uidx" ON "personal_api_tokens" USING btree ("token_hash");

ALTER TABLE "personal_api_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own personal API tokens"
  ON "personal_api_tokens"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS "mcp_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_id" uuid NOT NULL REFERENCES "public"."personal_api_tokens"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "tool_name" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mcp_audit_logs_user_id_idx" ON "mcp_audit_logs" USING btree ("user_id", "created_at");

ALTER TABLE "mcp_audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own MCP audit logs"
  ON "mcp_audit_logs"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
