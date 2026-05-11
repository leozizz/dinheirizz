# Copilot Instructions for Dinheirizz

## Project Overview
**Dinheirizz** is a serverless PWA for personal & group finance tracking with AI-generated weekly insights via WhatsApp. 100% cost-optimized architecture using Next.js + Supabase + Gemini API.

**Tech Lead Persona**: Gemini  
**Status**: Approved v1.0.0 (2026-05-08)

---

## Core Tech Stack

| Layer | Technology | Version | Key Point |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js (App Router) | 16.2.4 | Vercel deployment, PWA + TypeScript, Radix UI components |
| **Backend** | Supabase (Edge Functions/Deno) | — | Event-driven, zero infrastructure cost |
| **Database** | PostgreSQL (Supabase) | 15.x | RLS for multi-user data isolation |
| **AI Insights** | Gemini 1.5 Flash | — | Weekly report aggregation & generation |
| **Notifications** | WhatsApp Cloud API (Meta) | v20+ | Cron-triggered delivery |
| **Auth** | Supabase Auth (JWT) | — | Row Level Security enforced |

---

## Essential Commands

```bash
# Development
pnpm dev        # Start dev server (http://localhost:3000)
pnpm build      # Build with Turbopack (optimized)
pnpm start      # Run production build locally
pnpm lint       # Run ESLint checks

# Verify environment
node --version  # Should be v24.14.0+
pnpm --version  # Should be 10.32.1+
```

---

## Architecture & Key Decisions

### 1. **Serverless-First Approach**
- ✅ **No VPS or always-on servers** — Edge Functions trigger on-demand  
- ✅ **Zero infrastructure cost** — Auto-scaling, pay-per-use  
- ❌ **Avoid**: Long-running processes, cron jobs on app servers

### 2. **Row Level Security (RLS) Everywhere**
- **Tables affected**: `transactions`, `categories`, `users`
- **Rule**: `SELECT/INSERT/UPDATE WHERE auth.uid() = user_id`
- **Benefit**: Users can't access each other's financial data
- **Test requirement**: Always verify RLS policies before data mutations

### 3. **Token Optimization for Gemini**
- **Pattern**: Aggregate data in Deno Edge Functions before API calls
- **Payload**: Only send `{ periodo, categorias: { nome: total }, total_geral, maior_gasto }`
- **Cost**: Minimizes API spend on free tier

### 4. **Component Architecture**
- **`components/`** — Feature components + custom cards
- **`components/ui/`** — Radix UI library (shadcn/ui structure)
- **Pattern**: Glass-morphism aesthetic with Tailwind CSS

---

## Project Structure Reference

```
/workspaces/dinheirizz/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard
│   ├── layout.tsx         # Root layout with theme provider
│   └── globals.css        # Global styles
├── components/
│   ├── balance-card.tsx       # Account balance display
│   ├── expense-pie-chart.tsx  # Category breakdown chart
│   ├── transactions-list.tsx  # Transaction history
│   ├── quick-actions.tsx      # Add transaction, etc.
│   ├── glass-card.tsx         # Glass-morphism wrapper
│   ├── theme-provider.tsx     # Dark/light theme
│   └── ui/                    # Radix UI components (40+ files)
├── hooks/
│   ├── use-mobile.ts      # Mobile detection hook
│   └── use-toast.ts       # Toast notifications
├── lib/
│   └── utils.ts           # Utility functions (classnames, etc.)
├── specs/                 # Project documentation
│   ├── technical-spec.md  # Full tech architecture
│   ├── feature-spec.md    # Feature requirements
│   └── persona-spec.md    # Lucas persona definition
├── next.config.mjs
├── tsconfig.json
├── components.json        # shadcn/ui config
└── package.json
```

---

## Key Files to Know

| File | Purpose | Status |
|------|---------|--------|
| [app/page.tsx](app/page.tsx) | Main dashboard entry point | ✓ Frontend structure |
| [app/layout.tsx](app/layout.tsx) | Root theme + auth provider | ✓ Browser context |
| [components/balance-card.tsx](components/balance-card.tsx) | Net balance widget | Feature complete |
| [components/expense-pie-chart.tsx](components/expense-pie-chart.tsx) | Category distribution | Using Recharts (v2.15.0) |
| [specs/technical-spec.md](specs/technical-spec.md) | Full DB + API contracts | Reference for backend |

---

## Development Patterns

### 1. **Creating New Components**
```typescript
// Always use TypeScript strict mode
import React from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return <div className="glass-morphism">...</div>;
}
```

### 2. **Styling Convention**
- **Framework**: Tailwind CSS 4.2.0
- **Theme**: CSS variables (dark/light mode via next-themes)
- **Pattern**: Glass-morphism effects using `backdrop-blur` + `bg-opacity`
- **UI Library**: Radix UI with shadcn/ui structure

### 3. **Data Fetching (Future Server Actions)**
```typescript
// Pattern: Server Actions for mutations
'use server'

async function upsertTransaction(data: TransactionInput) {
  // Supabase client with RLS context
  // Always validate user_id matches auth.uid()
  const { data: result, error } = await supabase
    .from('transactions')
    .insert(data);
}
```

### 4. **Environment Variables**
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
META_WHATSAPP_TOKEN=...
META_WEBHOOK_VERIFY_TOKEN=...
```

---

## Common Patterns & Best Practices

### ✅ Do's
- Use **TypeScript** for type safety (no `any` types)
- Leverage **shadcn/ui components** for consistency
- Implement **RLS policies** for all data mutations
- Aggregate data **before API calls** (reduce token usage)
- Test **RLS access** with different user contexts
- Use **pnpm** exclusively (lock file included)

### ❌ Avoid
- Direct SQL queries without RLS enforcement
- Large unoptimized Gemini API payloads
- Breaking glass-morphism design aesthetics
- Using npm/yarn (stick to pnpm)
- Long-running Deno Edge Functions (>30s timeout)
- Storing secrets in `.env` (use Supabase Vault)

---

## Testing Strategy

| Layer | Tool | Min. Coverage | Note |
|-------|------|---------------|------|
| Unit | Jest | 80% | Component logic + utilities |
| Integration | — | — | RLS policy verification needed |
| E2E | — | — | Future: Playwright for auth flows |

---

## Deployment Checklist

- [ ] Build succeeds: `pnpm build` (Turbopack)
- [ ] Linting passes: `pnpm lint`
- [ ] Environment variables set in Vercel dashboard
- [ ] Supabase RLS policies enabled
- [ ] Gemini & WhatsApp API keys in Supabase Vault
- [ ] Edge Function cron trigger configured
- [ ] Test whatsapp webhook endpoint

---

## Known Constraints & Gotchas

1. **Next.js 16 with Turbopack** — Fast builds, but some plugins may need updates
2. **Supabase Free Tier Limits**:
   - 500 MB database storage
   - 2 GB bandwidth / month
   - Function CPU usage: 2GB RAM, 15-minute timeout
3. **Gemini Free Tier**: ~32,000 queries/month (batch wisely)
4. **WhatsApp**: 1,000 msgs/month free (daily report limit with group support)
5. **Radix UI Headless**: Requires custom styling — no pre-built themes

---

## Documentation Reference

- **Technical Details**: See [specs/technical-spec.md](specs/technical-spec.md)
- **Features**: See [specs/feature-spec.md](specs/feature-spec.md)
- **Persona Context**: See [specs/persona-spec.md](specs/persona-spec.md)

---

## Getting Help

When implementing features:
1. Check existing component patterns in [components/](components/)
2. Review DB schema in [specs/technical-spec.md](specs/technical-spec.md#modelo-de-dados)
3. Verify RLS requirements before mutations
4. Test with `pnpm dev` before building

For complex tasks, reference the **Edge Function cron pattern** in the technical spec for backend workflows.
