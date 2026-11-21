CREATE TABLE IF NOT EXISTS "subscription_ignores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"normalized_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_ignores" ADD CONSTRAINT "subscription_ignores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_ignores_user_id_idx" ON "subscription_ignores" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_ignores_user_key_unique" ON "subscription_ignores" USING btree ("user_id","normalized_key");
--> statement-breakpoint
ALTER TABLE "subscription_ignores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can manage their own ignored subscriptions"
  ON "subscription_ignores"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
