ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "username" text UNIQUE,
ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS "providers" text[] DEFAULT ARRAY['email']::text[],
ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
