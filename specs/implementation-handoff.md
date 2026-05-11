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
