# 📜 AGENTS.md — Regras Globais & Constituição do Time Dinheirizz

> **Documento Mestre Compartilhado**  
> **Status:** Ativo e Mandatório para Todos os Agentes Paperclip AI  
> **Aplica-se a:** Tech Lead, PM, Backend Developer, Frontend Developer, UX Reviewer, QA Engineer, DevOps Engineer  

---

## 1. Missão do Projeto
O **Dinheirizz** é uma plataforma de gestão financeira pessoal e empresarial moderna, de alta performance, segura e responsiva, desenvolvida com React 19, TypeScript estrito, Vite 6 (`VitePWA`), Tailwind CSS v4, Radix UI / shadcn (`new-york`), TanStack React Query, Zod + React Hook Form, Hono 4 (`api/` + Cloudflare Pages Functions `functions/`), Drizzle ORM, Supabase (PostgreSQL + Auth + RLS), Resend e deploy automatizado no Cloudflare Pages.

Nenhum agente está autorizado a violar os princípios de segurança, performance, estabilidade, qualidade estética Anti-Slop e arquitetura descritos neste documento.

---

## 2. Topologia do Repositório
```
dinheirizz/
├── src/                    # Frontend React 19 SPA + PWA (Vite 6 + Tailwind v4 + shadcn/ui)
│   ├── components/         # Componentes UI reutilizáveis (Radix UI / shadcn)
│   ├── hooks/              # Custom React Hooks (TanStack Query, estado, UI)
│   ├── lib/                # Utilitários, clientes de dados, Web Crypto e helpers
│   ├── pages/              # Páginas e views da aplicação
│   ├── services/           # Camada de serviços e integração Supabase/API
│   ├── styles/             # Tokens de design e CSS global (src/index.css)
│   └── types/              # Tipagens TypeScript e Database Types
├── api/                    # Aplicação REST Hono 4 (/api/*) + middlewares + testes de API
├── functions/              # Cloudflare Pages Functions adapter (/functions/api/[[route]].ts)
├── drizzle/                # Schemas relacionais e migrações do Drizzle ORM
├── public/                 # Assets públicos estáticos e PWA manifest
├── scripts/                # Scripts de automação, migração de DB e Paperclip bridge
├── tools/agent-standards/  # Motor de auditoria e sincronização de padrões (standards:*)
├── specs/                  # Especificações SDD (spec.*.md, plan.*.md, testing.md)
├── docs/                   # Documentação arquitetural, UI/UX e guias operacionais
├── .skills/                # Catálogo local de skills importado no Paperclip
└── .agents/                # Subpastas isoladas por persona (pm, tech-lead, backend, frontend, ux-reviewer, qa, devops)
```

---

## 3. Regras de Ouro Inegociáveis (Non-Negotiables)

1. **Spec-Driven Development (SDD) Obrigatório:**
   - Nenhuma linha de código de feature ou refatoração estrutural é escrita sem uma `specs/spec.{ID}.md` aprovada pelo Tech Lead.
   - Nenhum código é alterado sem antes ter um `specs/plan.{ID}.md` descrevendo os passos Red → Green → Refactor.
   - Os arquivos `specs/spec.md` e `specs/plan.md` na raiz são templates e **nunca** devem ser alterados ou sobrescritos.

2. **Tipagem e Sintaxe Estrita:**
   - ❌ **PROIBIDO** o uso de `any` em qualquer circunstância.
   - ✅ Parâmetros e retornos de funções devem possuir tipagem estrita explícita.
   - ✅ **SEMPRE** utilizar arrow functions (`const fn = () => {}`) em componentes e funções de lógica. Nunca use `function` tradicional.
   - ✅ **Contratos & Formulários:** Validar inputs de API e formulários com `Zod` (`zod` + `react-hook-form`).

3. **Design System, Dual-Theme & Gate Anti-Slop:**
   - 🎨 Dois temas oficiais: **Escuro (`Dark Luxury` `#0d0e12` + Neon Lime `#7bc816`)** e **Claro Clean (`Light Clean` — item ativo de Roadmap)**. Toda nova tela/componente deve usar CSS custom properties / tokens semânticos (`src/index.css`) compatíveis com ambos os temas, zero cores hardcoded fora de tokens.
   - ❌ **PROIBIDO** o uso de `!important` no CSS. Todas as regras de sobreposição devem respeitar a especificidade e os tokens de design.
   - ✅ **OBRIGATÓRIO**: Todos os botões, campos de entrada e seletores interativos devem conter `data-testid` para testes automatizados.
   - 🚫 **Zero AI-Slop:** Proibido layout genérico de IA (excessos de gradientes roxos/neon sem propósito, glow excessivo, emojis em labels, cards repetitivos sem hierarquia visual, texto artificial/robótico). Toda interface passa pelo gate visual do **UX Reviewer** antes do **QA**.

4. **Auditoria e Gate de Qualidade UI/UX & Responsividade Mobile/Desktop:**
   - É mandatório que toda entrega com interface visual atenda rigorosamente aos testes de layout responsivo em Browser real (Playwright MCP / Playwright CLI).
   - **Sem Overflow Horizontal:** `document.documentElement.scrollWidth <= window.innerWidth` em viewports mobile (`375px` / `390px`), tablet (`768px`) e desktop (`1280px` / `1440px`).
   - **Sem Quebras ou Elementos Sobrepostos:** Botões, inputs, modais, drawers e dropdowns não podem colidir ou ter problemas de `z-index`.
   - **Acessibilidade:** WCAG 2.1/2.2 AA (contraste mínimo de 4.5:1, touch target mínimo de 44x44px e atributos `aria-label`).

5. **Segurança, Isolamento de Runtime & Higiene de Código:**
   - ❌ **XSS Proibido**: Nunca utilizar `innerHTML` sem sanitização.
   - ❌ **Credenciais Proibidas**: Nunca commitar API keys, senhas, chaves Supabase `service_role` ou tokens Resend hardcoded.
   - 🛡️ **Isolamento de Runtime:** `src/` roda em Browser/PWA (proibido importar `node:fs`, `path`, `child_process`, `crypto` do Node); usar `crypto.subtle` (Web Crypto API). `api/` e `functions/` rodam em Cloudflare Pages Functions (`nodejs_compat`) + Hono 4.
   - ❌ Remover `console.log` e chamadas de depuração residuais antes de abrir PR.
   - ❌ Proibido blocos `catch` vazios sem tratamento ou logging estruturado.
   - ✅ Auditoria mecânica obrigatória antes do PR: `pnpm standards:review`.

6. **Git, Branching e Pull Requests:**
   - ❌ **PROIBIDO** fazer commits ou merges diretos na branch `main`.
   - ✅ Toda alteração deve ser desenvolvida em branch isolada: `feat/{id}-{slug}` ou `fix/{id}-{slug}`.
   - ✅ **Backlog-Driven:** Sempre trabalhar em uma task Paperclip vinculada a uma issue do GitHub; consultar `AGENTS.md` e `STANDARDS.md` antes de codar.
   - Pull Requests devem conter título semântico, descrição clara em UTF-8 limpo e passar por validação de UX Reviewer (quando houver UI), QA e aprovação do Tech Lead.

7. **Codificação Estrita UTF-8 em Comentários, Issues e Respostas:**
   - Todas as mensagens, comentários de issues no Paperclip, logs e documentações **devem** ser emitidas em **UTF-8 nativo** com caracteres da língua portuguesa acentuados corretamente (ex: `ação`, `priorização`, `médio`).
   - É terminantemente proibido enviar saídas com caracteres corrompidos (*mojibake* ou interrogações).
   - Scripts e comandos no ambiente Windows devem assegurar `chcp 65001`.

8. **GitHub como Fonte Única da Verdade & Orquestração Contínua de Pipeline (7 Etapas):**
   - O **GitHub Issues / Kanban** (`leozizz/dinheirizz`) é a fonte oficial e primária de verdade para todo o tracking de negócio, roadmap e priorização de backlog.
   - Fluxo oficial autônomo:
     `PM ➔ Tech Lead ➔ Backend / Frontend ➔ UX Reviewer (gate Anti-Slop via Playwright) ➔ QA (E2E/Vitest/standards:review) ➔ Tech Lead (Review/Aprovação) ➔ DevOps (Merge/Deploy/sync:close)`
   - O script `scripts/paperclip-sync.mjs` (`pnpm sync:*`) sincroniza as tarefas do GitHub para o Paperclip e fecha o ciclo automaticamente via `pnpm sync:close <GH_NUMBER> --pr <PR_NUMBER> --dispatch-next`.
