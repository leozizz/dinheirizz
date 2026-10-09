ALTER TABLE "transactions" ADD COLUMN "recurrence_day" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "adjust_business_day" boolean DEFAULT false NOT NULL;