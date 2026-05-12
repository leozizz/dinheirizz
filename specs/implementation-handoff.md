# Dinheirizz - Implementation Handoff

## Purpose

This document records the work completed so far for the financial intelligence PWA and the technical context required to continue in a new agent session without re-deriving the same facts.

## User Goal

The user asked to evolve the existing dashboard without changing the current layout, using the approved technical specification, the Lucas persona, and the Supabase integration feature spec.

The intended direction is a serverless finance product built on Next.js + Supabase + Gemini + WhatsApp, with RLS enforcing data isolation and with the UI staying visually intact.

## Source Specs Used

- [specs/technical-spec.md](specs/technical-spec.md)
- [specs/feature-spec.md](specs/feature-spec.md)
- [specs/persona-spec.md](specs/persona-spec.md)

## Key Product Principles

- Preserve the existing dashboard layout and visual language.
- Keep the stack serverless-first.
- Use RLS as the security boundary.
- Optimize data payloads for token economy when sending summaries to AI.
- Prefer server-side data access through Supabase-backed helpers and Server Actions.

## Repository State Before Changes

The workspace started with a dashboard-oriented Next.js app and a set of UI components already present, but without a working Supabase integration layer or transaction actions wired into the UI.

The important existing surfaces were:

- [app/page.tsx](app/page.tsx)
- [components/transactions-list.tsx](components/transactions-list.tsx)
- [components/quick-actions.tsx](components/quick-actions.tsx)
- [components/balance-card.tsx](components/balance-card.tsx)
- [components/expense-pie-chart.tsx](components/expense-pie-chart.tsx)
- [lib/utils.ts](lib/utils.ts)

## Supabase Schema Snapshot

The Supabase AI snapshot proved that the schema in the live database is different from the initial technical spec and must be followed exactly.

### `categories`

- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, not null
- `name` text, not null
- `type` text, not null, default `'expense'`
- `created_at` timestamptz, not null, default `now()`

### `transactions`

- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, not null
- `account_id` uuid, not null
- `category_id` uuid, nullable
- `occurred_at` date, not null
- `amount` numeric, not null
- `description` text, nullable
- `paid` boolean, not null, default `true`
- `created_at` timestamptz, not null, default `now()`

## Constraints Snapshot

Important constraints returned by Supabase AI:

- `categories_user_id_fkey` -> `users(id)` with `ON DELETE CASCADE`
- `categories_user_id_name_key` -> unique `(user_id, name)`
- `transactions_user_id_fkey` -> `users(id)` with `ON DELETE CASCADE`
- `transactions_account_id_fkey` -> `accounts(id)` with `ON DELETE SET NULL`
- `transactions_category_id_fkey` -> `categories(id)` with `ON DELETE SET NULL`
- `transactions_amount_positive_chk` -> `amount > 0`

## Indexes Snapshot

Relevant indexes returned:

- `idx_categories_user_id`
- `categories_user_id_name_key`
- `idx_transactions_user_id`
- `idx_transactions_occurred_at`

## RLS Snapshot

RLS is enabled on both tables and the policies are explicit for each CRUD verb.

### `categories`

- `SELECT` own rows
- `INSERT` own rows
- `UPDATE` own rows
- `DELETE` own rows

### `transactions`

- `SELECT` own rows
- `INSERT` own rows
- `UPDATE` own rows
- `DELETE` own rows

Policy logic uses `auth.uid()` compared to `user_id`.

## Triggers and Functions Snapshot

The snapshot returned no public triggers and no public functions in the `public` schema.

This means there is no existing RPC layer to reuse; the integration must rely on direct queries through Supabase-js or introduce new RPCs later if needed.

## Queries Requested from Supabase AI

The Supabase AI prompt was used to retrieve the schema snapshot, constraints, indexes, RLS status, policies, triggers, and public functions.

The AI initially returned only the query texts, so a second prompt was sent requesting the executed results and the full rows.

## Implementation Completed

### 1. Supabase client and data helpers

Created [lib/supabase.ts](lib/supabase.ts) with:

- `supabase` client for the public anon key
- `supabaseAdmin` client for the service role key
- `getTransactions(userId, opts)`
- `upsertTransaction(userId, input)`
- `deleteTransaction(userId, id)`
- `getCategories(userId)`

### 2. Server Actions wrappers

Created [app/actions/transactions.ts](app/actions/transactions.ts) with server-side wrappers:

- `serverGetTransactions`
- `serverGetCategories`
- `serverUpsertTransaction`
- `serverDeleteTransaction`

### 3. UI adapter for transactions

Updated [components/transactions-list.tsx](components/transactions-list.tsx) so it can render real Supabase rows while keeping the current dashboard fallback data intact.

This preserves the existing layout and only changes the data source contract.

### 4. Validation and schema alignment

The implementation was aligned to the real schema, not the initial spec text. The following differences were handled:

- `occurred_at` instead of `date`
- `paid` instead of `is_paid`
- `account_id` required on transactions
- `category_id` nullable
- category records containing `type`

### 5. ESLint setup

Added [eslint.config.mjs](eslint.config.mjs) because the repository did not have an ESLint config and `pnpm lint` could not run.

Installed compatible lint tooling:

- `eslint`
- `eslint-config-next`

## Validation Results

### Passed

- `pnpm build` completed successfully.
- `get_errors` returned no errors for the touched files:
  - [lib/supabase.ts](lib/supabase.ts)
  - [app/actions/transactions.ts](app/actions/transactions.ts)
  - [components/transactions-list.tsx](components/transactions-list.tsx)

### Lint status

`pnpm lint` now runs, but it still fails because of pre-existing issues outside the touched slice:

- [components/ui/carousel.tsx](components/ui/carousel.tsx)
- [components/ui/sidebar.tsx](components/ui/sidebar.tsx)
- [components/ui/use-mobile.tsx](components/ui/use-mobile.tsx)
- [hooks/use-mobile.ts](hooks/use-mobile.ts)
- warning in [hooks/use-toast.ts](hooks/use-toast.ts)

These are repository debt items, not regressions introduced by the Supabase integration.

## Files Added or Updated

- [lib/supabase.ts](lib/supabase.ts)
- [app/actions/transactions.ts](app/actions/transactions.ts)
- [components/transactions-list.tsx](components/transactions-list.tsx)
- [eslint.config.mjs](eslint.config.mjs)
- [package.json](package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)
- [specs/pompt-return.md](specs/pompt-return.md)

## Important Technical Notes for Future Agents

1. The live schema in Supabase is the source of truth, not the initial feature spec text.
2. Transactions are date-based on `occurred_at`, so month/year filters should be computed against that column.
3. `category_id` is optional in the database, so UI and validation should not assume every transaction has a category.
4. `account_id` is mandatory for transaction mutations.
5. RLS is already active and policies are owner-scoped, so the server actions should preserve `user_id` from the authenticated session.
6. There is no public RPC/function layer yet, so future optimizations can add RPCs only if needed.
7. The dashboard layout should remain untouched unless explicitly requested.

## Next Recommended Step

The next rational step is to wire the new transaction helpers into the UI data flow, while keeping the current visual layout intact. The most likely follow-up is to connect [components/transactions-list.tsx](components/transactions-list.tsx) and the quick action surfaces to the new Server Actions with real Supabase-backed state.

## Authentication and Route Restructure Completed

The application shell was reoriented around authentication instead of the dashboard landing page. The current routing contract is:

- `/` renders the login experience.
- `/dashboard` renders the protected finance dashboard.
- Authenticated users entering `/` are redirected to `/dashboard`.
- Unauthenticated users trying to access `/dashboard` are redirected to `/`.

This change was made to match the request for a restricted dashboard and a login-first entry flow.

## Login Surface Implemented

The login UI now lives in [components/login-screen.tsx](components/login-screen.tsx) and is mounted directly from [app/page.tsx](app/page.tsx).

### Login behavior

- Uses `@supabase/auth-helpers-nextjs` browser auth helper for session-aware sign-in.
- Supports OAuth buttons for Google and Apple.
- Includes an expandable e-mail/password form animated with Framer Motion.
- Redirect target after successful sign-in is `/dashboard`.
- The form preserves the glassmorphism visual language from the design system.

### Login UX details

- Centralized card with glass background, blur, border translucency, and subtle gradients.
- Minimal button set, each with Lucide icons.
- The e-mail form expands/collapses instead of occupying permanent space.
- Password field includes show/hide interaction.

## Dashboard Route Implemented

The previous root dashboard was moved into [app/dashboard/page.tsx](app/dashboard/page.tsx).

### What the dashboard now does

- Reads the authenticated user from Supabase on the server.
- Redirects to `/` if there is no active session.
- Fetches the authenticated user’s transactions with `serverGetTransactions(user.id, { limit, month, year })`.
- Builds a per-user monthly summary from the fetched transactions.
- Keeps the existing visual structure: balance card, quick actions, chart, transactions list, monthly summary.

### Data flow notes

- Dashboard data is now user-scoped by authenticated `user.id`.
- The summary card is computed from the user’s own transaction list, not from shared or static sample data.
- `TransactionsList` continues to accept Supabase-backed rows through its existing `transactions` prop.

## Middleware Implemented

Added [middleware.ts](middleware.ts) to enforce session-based routing at the edge.

### Middleware rules

- If the request is for `/` and a session exists, redirect to `/dashboard`.
- If the request is for `/dashboard` and no session exists, redirect to `/`.
- The middleware uses `createServerClient` from `@supabase/auth-helpers-nextjs` with cookie passthrough so session refresh remains functional.

### Why this matters

- It prevents the login page from being shown to already-authenticated users.
- It blocks direct access to the dashboard without a valid session.
- It aligns with the Supabase auth helper model where session state is synchronized through cookies.

## Current Environment Variables Required

The implementation currently expects these environment variables to be present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The login page and middleware also assume the browser/server auth helper can read those public values at runtime.

## Important Implementation Notes Added During This Stage

1. `@supabase/auth-helpers-nextjs` in this workspace exposes `createBrowserClient` and `createServerClient`; these are the helpers used in the current auth flow.
2. The login component is a client component because it needs interactive OAuth buttons, the expandable e-mail form, and client-side session checks.
3. The dashboard is a server component because it must resolve the authenticated user before rendering and can then fetch user-scoped data safely.
4. The current dashboard summary values are now derived from fetched transactions, but some legacy decorative cards still keep their original visual purpose until the backend/UI wiring is expanded further.
5. The route structure is now canonical for the app: `/` for login and `/dashboard` for authenticated financial overview.

## Validation Performed For This Stage

- `get_errors` returned no errors for [components/login-screen.tsx](components/login-screen.tsx), [app/page.tsx](app/page.tsx), [app/dashboard/page.tsx](app/dashboard/page.tsx), and [middleware.ts](middleware.ts).
- ESLint was run on the touched files and completed without errors after cleanup.

## Repository State After This Stage

The codebase now has a clear auth boundary and a protected dashboard route. Future agents should start from the following anchors when extending behavior:

- [app/page.tsx](app/page.tsx) for the login entry point.
- [components/login-screen.tsx](components/login-screen.tsx) for auth UI and provider handling.
- [app/dashboard/page.tsx](app/dashboard/page.tsx) for protected, user-scoped finance rendering.
- [middleware.ts](middleware.ts) for session gating and redirect policy.
- [app/actions/transactions.ts](app/actions/transactions.ts) and [lib/supabase.ts](lib/supabase.ts) for server-side data access.

## Suggested Prompt for Future Agents

Use this as the starting prompt in a new session:

```markdown
# Context

Dinheirizz is a Next.js 16 App Router app using Supabase Auth and Supabase DB.

# Current route contract

- `/` is the login screen.
- `/dashboard` is the protected authenticated dashboard.
- Middleware redirects authenticated users from `/` to `/dashboard`.
- Middleware redirects unauthenticated users from `/dashboard` to `/`.

# Current auth implementation

- Login screen lives in `components/login-screen.tsx`.
- It uses `@supabase/auth-helpers-nextjs` browser client.
- It supports OAuth for Google and Apple.
- It includes an expandable e-mail/password form animated with Framer Motion.

# Current dashboard implementation

- Dashboard lives in `app/dashboard/page.tsx`.
- It reads the authenticated user on the server.
- It fetches the current user’s transactions via `serverGetTransactions(user.id, { limit, month, year })`.
- It computes a monthly summary from the fetched rows.

# Important files

- `app/page.tsx`
- `components/login-screen.tsx`
- `app/dashboard/page.tsx`
- `middleware.ts`
- `app/actions/transactions.ts`
- `lib/supabase.ts`

# Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

# Implementation notes

- Keep the glassmorphism visual language.
- Keep the dashboard layout stable.
- Prefer user-scoped data on the server.
- Preserve RLS assumptions and auth boundary.
```
