CREATE TABLE IF NOT EXISTS "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"summary" text NOT NULL,
	"financial_health_score" numeric(5, 2) NOT NULL,
	"highlights" text[] DEFAULT ARRAY[]::text[],
	"alerts" text[] DEFAULT ARRAY[]::text[],
	"recommendations" text[] DEFAULT ARRAY[]::text[],
	"metrics_snapshot" text,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
