# plan.md
# Plano de Implementação — [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Dinheirizz 2.0)

> Gerado pelo agente após aprovação da `spec.md`.
> **Aguardando aprovação antes de qualquer escrita de código.**
> Arquivo local — não commitado (ver `specs/.gitignore`).

---

## Resumo do entendimento

A Issue #2 e o Épico #1, combinados com as diretrizes do usuário, demandam uma reestruturação total da aplicação Dinheirizz. O projeto será resetado da arquitetura legada (Next.js) e reconstruído em torno de uma stack moderna e performática:
1. **Frontend:** React 19 SPA/PWA com Vite e `pnpm`, mantendo total fidelidade estética ao `specs/design-system.md` (Glassmorphism, tokens OKLCH).
2. **Backend BFF:** HonoJS no diretório `/api`, projetado para execução em Edge Functions no Cloudflare Pages (via Wrangler).
3. **Persistência e Banco:** Supabase Cloud gerenciado via Drizzle ORM (`drizzle.config.ts`, `schema.ts`) com as entidades `users`, `accounts`, `categories`, `transactions` e `pix_keys`, além da Supabase CLI para migrations e tipagens.
4. **TDD & Testes:** Configuração completa de Vitest com mocks obrigatórios do Drizzle ORM, impedindo que testes executem qualquer comando destrutivo no banco em nuvem.

---

## Dúvidas e ambiguidades

- Nenhuma ambiguidade bloqueante. A vinculação definitiva da CLI com a nuvem (`supabase link`) utilizará as credenciais do ambiente ou ficará preparada via scripts no `package.json`, enquanto os testes automatizados operam 100% isolados com mocks do Drizzle conforme exigência explícita.

---

## Sequência de implementação

> Os passos seguem a ordem Red → Green → Refactor quando há testes envolvidos.
> Passo de teste vem antes do passo de implementação correspondente.

### Passo 1 — Limpeza do Legado Next.js e Preparação da Branch

**O que faz:**
- Garantir que a branch ativa é `feat/v2-foundation`.
- Remover arquivos e diretórios legados do Next.js (`app/`, `next.config.mjs`, `next-env.d.ts`, `middleware.ts`).
- Preservar componentes visuais reutilizáveis em `components/` e utilitários em `lib/` para posterior integração na v2.
- Atualizar `.gitignore` adicionando saídas de build do Vite (`dist/`), Cloudflare (`.wrangler/`) e Drizzle (`.drizzle/`).

**Arquivos criados/alterados:**
- REMOVER: `app/`, `next.config.mjs`, `next-env.d.ts`, `middleware.ts`
- ALTERAR: `.gitignore`
**Teste:** Nenhum (operação de remoção de arquivos legados de infraestrutura).

---

### Passo 2 — Configuração das Ferramentas, `package.json` com `pnpm` e Setup do Vite (PWA)

**O que faz:**
- Reconfigurar `package.json` substituindo dependências do Next.js por:
  - Frontend: `react`, `react-dom`, `@vitejs/plugin-react`, `vite`, `vite-plugin-pwa`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`, `radix-ui`.
  - Backend: `hono`, `@hono/node-server` (dev local), `drizzle-orm`, `drizzle-kit`, `postgres`, `zod`.
  - Testes: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
  - Dev/Infra: `wrangler`, `supabase` (CLI).
- Instalar dependências executando `pnpm install`.
- Configurar `vite.config.ts` com suporte a aliases (`@/` -> `src/` ou `./`) e PWA.
- Criar `index.html` e a casca React em `src/main.tsx`, `src/App.tsx`, `src/index.css` incorporando os tokens e o design glassmorphism de `specs/design-system.md`.
- Atualizar `tsconfig.json` para suporte adequado ao Vite e React 19.

**Arquivos criados/alterados:**
- CRIAR: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- ALTERAR: `package.json`, `tsconfig.json`
**Teste:** Ver Passo 3 (TDD do frontend).

---

### Passo 3 — Teste Unitário da Fundação Frontend (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/App.spec.tsx` verificando renderização da casca da aplicação Dinheirizz e presença das classes glassmorphism.
- **🟢 Green:** Implementar/ajustar `src/App.tsx` para garantir que o componente renderize com o layout e container base sem erros.
- **🔵 Refactor:** Ajustar tokens e imports modulares.

**Arquivos criados/alterados:**
- CRIAR: `src/tests/App.spec.tsx`, `vitest.config.ts`
- ALTERAR: `src/App.tsx`
**Teste:** `src/tests/App.spec.tsx` — Vitest unitário com jsdom.

---

### Passo 4 — Estruturação do BFF HonoJS em `/api` e Configuração Wrangler

**O que faz:**
- Criar `wrangler.toml` configurando projeto para Cloudflare Pages / Workers.
- Criar `api/index.ts` inicializando a aplicação Hono, com middlewares de CORS e errorHandler.
- Criar rotas `/api/health`, `/api/v1/categories` e `/api/v1/transactions`.

**Arquivos criados/alterados:**
- CRIAR: `wrangler.toml`, `api/index.ts`, `api/src/routes/health.ts`, `api/src/routes/categories.ts`, `api/src/routes/transactions.ts`
**Teste:** Ver Passo 6.

---

### Passo 5 — Modelagem do Drizzle ORM e Setup da Supabase CLI

**O que faz:**
- Configurar `drizzle.config.ts` apontando para o schema do banco de dados.
- Criar `api/src/db/schema.ts` com as tabelas: `users`, `accounts`, `categories`, `transactions`, `pix_keys`.
- Criar `api/src/db/client.ts` para conexão com o Supabase Postgres via Drizzle.
- Criar scripts no `package.json` para migrações Drizzle (`pnpm db:generate`, `pnpm db:migrate`) e Supabase CLI (`pnpm supabase:types`).

**Arquivos criados/alterados:**
- CRIAR: `drizzle.config.ts`, `api/src/db/schema.ts`, `api/src/db/client.ts`
- ALTERAR: `package.json`
**Teste:** Ver Passo 6.

---

### Passo 6 — Testes de Integração do BFF com Mocks do Drizzle ORM (TDD)

**O que faz:**
- **🔴 Red:**
  - Criar `api/tests/health.spec.ts` testando retorno `{ status: "ok", version: "2.0.0" }`.
  - Criar `api/tests/transactions.spec.ts` testando `GET /api/v1/transactions` e validação Zod no `POST /api/v1/transactions`.
- **🟢 Green:**
  - Criar `api/tests/setup.ts` interceptando e mockando o client Drizzle ORM para garantir isolamento e nenhuma chamada à nuvem.
  - Finalizar os handlers de rotas do Hono integrados ao client Drizzle mockado.
- **🔵 Refactor:**
  - Otimizar tipagens compartilhadas e middlewares.

**Arquivos criados/alterados:**
- CRIAR: `api/tests/setup.ts`, `api/tests/health.spec.ts`, `api/tests/transactions.spec.ts`
- ALTERAR: `api/src/routes/transactions.ts`, `api/index.ts`
**Teste:** `api/tests/health.spec.ts`, `api/tests/transactions.spec.ts` — Vitest integração com mock do Drizzle.

---

### Passo 7 — Verificação e Validação Final

**O que faz:**
- Executar suíte completa de testes (`pnpm test`).
- Executar validação de build de produção (`pnpm build`).
- Garantir 100% de integridade no workspace.

**Arquivos criados/alterados:** Nenhum (validação geral).
**Teste:** `pnpm test` e `pnpm build`.

---

## Arquivos criados

```
vite.config.ts
index.html
src/main.tsx
src/App.tsx
src/index.css
src/tests/App.spec.tsx
vitest.config.ts
wrangler.toml
drizzle.config.ts
api/index.ts
api/src/db/schema.ts
api/src/db/client.ts
api/src/routes/health.ts
api/src/routes/categories.ts
api/src/routes/transactions.ts
api/tests/setup.ts
api/tests/health.spec.ts
api/tests/transactions.spec.ts
```

## Arquivos alterados

```
package.json            # Reconfiguração total de scripts e dependências (Vite, Hono, Drizzle, Vitest)
tsconfig.json           # Ajuste de target, jsx e path aliases
.gitignore              # Adição de dist/, .wrangler/, .drizzle/
specs/spec.md           # Preenchido PROJECT CONTEXT e ISSUE CONTEXT
specs/testing.md        # Preenchido convenções de teste
specs/plan.md           # Este plano de implementação
```

## Arquivos removidos

```
app/                    # Diretório legado Next.js
next.config.mjs         # Configuração legada Next.js
next-env.d.ts           # Tipagens legadas Next.js
middleware.ts           # Middleware legado Next.js
```

---

## Superfície de regressão

| Arquivo de teste | O que testa | Risco de quebra |
|------------------|-------------|-----------------|
| Nenhuma cobertura existente | Risco de regressão em funcionalidades legadas não migradas | Baixo na Fase 1 (limpeza intencional e isolamento em branch `feat/v2-foundation`) |

> Nenhuma cobertura existente no código legado — os novos testes de BFF e Frontend criados na Fase 1 estabelecerão a nova base de regressão contínua.

---

## Critérios de aceite × passos

| Critério (da spec, seção 8) | Atendido no Passo |
|-----------------------------|------------------|
| Nova branch `feat/v2-foundation` criada e ativa | Passo 1 |
| Remoção completa da infraestrutura legada Next.js | Passo 1 |
| Inicialização do frontend React com Vite (PWA) e `pnpm` | Passo 2 |
| Fidelidade rigorosa aos tokens e estilos de `specs/design-system.md` | Passo 2 & 3 |
| Servidor HonoJS (BFF) em `/api` configurado para Cloudflare Pages | Passo 4 |
| Drizzle ORM instalado e configurado via `drizzle.config.ts` | Passo 5 |
| Schemas das tabelas essenciais (Users, Accounts, Categories, Transactions, Pix_Keys) no Drizzle | Passo 5 |
| Supabase CLI configurada para migrations e tipos | Passo 5 |
| Vitest configurado para execução de testes | Passo 2 & 3 |
| Camada de Mocks do Drizzle ORM operacional | Passo 6 |
| Testes automatizados do BFF e Frontend passando com sucesso (`pnpm test`) | Passo 3, 6 & 7 |

---

## O que está fora deste plano

- Componentes e telas completas da Fase 2 (Dashboard analítico com gráficos, fluxos completos de login visual) — escopo da Issue de Fundação Visual.
- Modais rápidos especializados da Fase 3 (Carteira Pix, modais dedicados de Receita/Despesa).
- Integração de IA Gemini e disparos de e-mail com Resend (Fase 4).