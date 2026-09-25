ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'free' NOT NULL,
ADD COLUMN IF NOT EXISTS "pro_type" text,
ADD COLUMN IF NOT EXISTS "pro_expires_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "invited_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "insights"
ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'fallback' NOT NULL,
ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS "model_name" text;

CREATE TABLE IF NOT EXISTS "user_ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE REFERENCES "public"."users"("id") ON DELETE cascade,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"api_key_encrypted" text,
	"custom_model" text,
	"is_validated" boolean DEFAULT false NOT NULL,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
