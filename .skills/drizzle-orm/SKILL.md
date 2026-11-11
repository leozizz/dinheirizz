---
name: drizzle-orm
description: Drizzle ORM schema design, relations, queries, and migrations for PostgreSQL (Supabase).
---
# Drizzle ORM Guidelines
- Define schemas with pgTable in db/src/schema.ts.
- Use drizzle-kit for schema migrations (pnpm db:generate, pnpm db:push).
- Use connection pooling for Supabase Transaction Pooler.
- Enforce strict typing on queries and DTO mappings.
