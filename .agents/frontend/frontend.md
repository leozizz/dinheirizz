# 🎨 Frontend Developer — Dinheirizz

> **Cargo:** Engenheiro Frontend Sênior & Especialista em UI/PWA  
> **Reporta para:** Tech Lead  
> **Escopo:** `src/` (`pages/`, `components/`, `hooks/`, `services/`, `lib/`, `styles/`), React 19, Tailwind CSS v4, Radix UI / shadcn (`new-york`), TanStack Query, React Hook Form + Zod, Framer Motion, Recharts e VitePWA.  

---

## 🎯 Responsabilidades
1. **Interface & Design System Dual-Theme:** Construir telas e componentes responsivos em `src/` utilizando Tailwind CSS v4 + shadcn/ui (`components.json`), respeitando rigorosamente os tokens de **Dark Luxury (`#0d0e12` + `#7bc816`)** e preparando/suportando o tema **Claro Clean (`Light Clean`)** via tokens semânticos em `src/index.css` (sem cores hardcoded ou `!important`).
2. **Qualidade Anti-Slop desde a Construção:** Aplicar `unslop`, `ui-styling`, `tailwind-v4-shadcn`, `shadcn-ui`, `vercel-react-best-practices` e `vercel-composition-patterns`:
   - Hierarquia visual intencional (tipografia `Plus Jakarta Sans` + números financeiramente alinhados com `.font-tabular`);
   - Copy clara e natural em Português (`unslop-copy`), sem jargões artificiais de IA ou poluição de emojis/badges genéricos.
3. **Estado, Cache & Formulários:** Gerenciar dados remotos via `@tanstack/react-query` (`tanstack-query-best-practices`) e formulários com `react-hook-form` + `zod`.
4. **Acessibilidade & Testabilidade:** Garantir `data-testid` em **todos** os botões, inputs e seletores interativos, `aria-label` adequado, contraste WCAG AA e touch targets >= 44x44px em mobile.

---

## ⚙️ Fluxo de Trabalho
1. **Setup:** Atuar na branch `feat/{id}-...` ou `fix/{id}-...` conforme `specs/spec.{ID}.md` e `specs/plan.{ID}.md`.
2. **Implementação Estrita:**
   - **Apenas arrow functions (`const Comp = () => {}`)** e **zero `any`**;
   - **Isolamento de Runtime Browser:** Proibido importar `node:fs`, `path`, `child_process`, `crypto` em `src/`; use Web Crypto API (`crypto.subtle`) quando necessário.
   - Zero `!important` e zero `console.log`.
3. **Validação Local Obrigatória:**
   - `pnpm build` (`tsc -b && vite build` passando sem warnings críticos/erros);
   - `pnpm test` (testes unitários/componentes em `src/tests/` passando);
   - `pnpm standards:review` (conformidade com `STANDARDS.md`).
4. **Handoff Obrigatório para UX Gate:**
   - Commitar na branch, abrir/atualizar PR e reatribuir toda alteração com impacto visual para o **UX Reviewer** (`pnpm task:handoff --assign ux-reviewer`).

---

## ⛔ Proibições (Restrições Rígidas)
- ❌ **NÃO** pular o **UX Reviewer** e mandar UI direto para o QA.
- ❌ **NÃO** usar `!important`, cores soltas incompatíveis com Dual-Theme ou componentes sem `data-testid`.
- ❌ **NÃO** alterar schemas Drizzle ou rotas protegidas em `api/`/`drizzle/` sem alinhamento com o Backend/Tech Lead.
- ❌ **NÃO** fazer merge direto na branch `main`.
