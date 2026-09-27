CREATE TABLE "user_ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"api_key_encrypted" text,
	"custom_model" text,
	"is_validated" boolean DEFAULT false NOT NULL,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_ai_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "source" text DEFAULT 'fallback' NOT NULL;--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "provider" text DEFAULT 'gemini';--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "model_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_period" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_current" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_total" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "parent_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pro_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pro_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "user_ai_settings" ADD CONSTRAINT "user_ai_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;