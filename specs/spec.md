# spec.md
# Especificação de Implementação

> **Dois blocos distintos neste arquivo:**
>
> `PROJECT CONTEXT` — preenchido pelo `setup.md` uma vez por projeto. Não alterar por issue.
> `ISSUE CONTEXT`   — preenchido pelo `generate-spec.md` a cada issue.
>
> Remova seções inteiras do ISSUE CONTEXT que não se aplicarem à task atual.

---

<!-- ═══ PROJECT CONTEXT — preenchido pelo setup.md ═══ -->

## PC-1. Stack do Projeto

### Frontend
```
Framework:      React 19 (PWA)
Linguagem:      TypeScript 5
Build:          Vite
Estilização:    Tailwind CSS + Vanilla CSS Tokens (Glassmorphism)
Componentes:    Radix UI / shadcn/ui + Design System Próprio
Roteamento:     React Router / SPA Routing
Estado:         React Context / Hooks
```

### Backend
```
Framework:      Hono.js (/api)
Runtime:        Cloudflare Pages / Workers (Edge)
Linguagem:      TypeScript 5
Autenticação:   Supabase Auth
```

### Banco de Dados
```
Banco:          PostgreSQL (Supabase Cloud)
ORM / Query:    Drizzle ORM
Migrations:     Supabase CLI + Drizzle Kit
```

### Infraestrutura
```
Hospedagem:     Cloudflare Pages
Storage:        Supabase Storage
CI/CD:          GitHub Actions
```

---

## PC-2. CLIs Disponíveis

```bash
pnpm            # Gerenciador de pacotes preferencial
supabase        # Supabase CLI (migrations, gen types, link)
drizzle-kit     # Drizzle ORM migrations e schema generation
wrangler        # Cloudflare CLI para Pages & Workers
```

---

## PC-3. Estrutura de Pastas

```
/
├── api/            # Backend BFF HonoJS (Edge Functions para Cloudflare Pages)
│   ├── src/        # Rotas, controllers, middlewares e DB client
│   └── tests/      # Testes de integração do BFF com mocks do Drizzle
├── src/            # Frontend React SPA / PWA
│   ├── components/ # Componentes visuais e Glassmorphism Design System
│   ├── hooks/      # Custom React hooks
│   ├── lib/        # Utilitários e instâncias de clientes
│   ├── types/      # Tipagens TypeScript e database.types.ts
│   └── tests/      # Testes unitários do frontend
├── specs/          # Especificações (spec.md, testing.md, design-system.md)
└── public/         # Assets estáticos, manifest PWA, ícones
```

---

## PC-4. Convenções do Projeto

```
Nomenclatura de branches:  feat/, fix/, chore/, refactor/
Padrão de commits:         Conventional Commits (feat:, fix:, chore:, refactor:, test:)
Localização de testes:     api/tests/*.spec.ts, src/tests/*.spec.tsx
Variáveis de ambiente:     .env, .env.local, .env.example
Documentação interna:      specs/design-system.md, specs/testing.md, copilot-instructions.md
```

---

## PC-5. Restrições Permanentes do Projeto

```
- Sem `any` em TypeScript — strict mode obrigatório
- Manter fidelidade visual estrita a specs/design-system.md (OKLCH, Glassmorphism, temas)
- Proibido executar queries destrutivas ou migrações reais em nuvem durante testes automatizados (Drizzle deve ser mockado)
- Backend BFF alocado exclusivamente no diretório /api utilizando HonoJS
- Gerenciamento de pacotes estritamente com pnpm
- Sem console.log em código de produção
```

<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->

---
---

<!-- ═══ ISSUE CONTEXT — preenchido pelo generate-spec.md por issue ═══ -->

## 1. Identificação

```
Issue principal:    #2
Título:             [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Dinheirizz 2.0)
Tipo:               chore
Branch:             feat/v2-foundation
Milestone:          Dinheirizz 2.0 - Fase 1
```

**Issues relacionadas**
```
#1  🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
```

---

## 2. Contexto

> O que esta spec cobre e por que existe.
> Referenciar a issue — não duplicar o conteúdo dela.

Esta especificação define o alicerce técnico do Dinheirizz 2.0 conforme a Issue #2 e o Épico #1. Cobre a transição estrutural completa: eliminação do código legado em Next.js e reconstrução com React SPA/PWA via Vite, criação do backend BFF em HonoJS (/api) voltado para Cloudflare Pages, modelagem e integração do banco de dados na nuvem via Supabase CLI e Drizzle ORM, além da implantação da infraestrutura de testes em TDD (Vitest) com mocks do banco.

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
specs/design-system.md  # Diretrizes mandatórias de UI (Glassmorphism, tokens OKLCH, temas e componentes)
specs/testing.md        # Convenções do projeto para TDD e testes unitários/integração
copilot-instructions.md # Diretrizes gerais de padrões de projeto e engenharia
```

### 3.2 Issues via MCP
```
#2 [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Dinheirizz 2.0)
#1 🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap
```

Ler PRs atrelados a cada issue. Para PRs mergeados, ler o diff completo:
- Nenhum Pull Request atrelado no momento.

### 3.3 Arquivos do repositório
```
package.json            # Dependências legadas, scripts e ferramentas
lib/supabase.ts         # Contratos e tipos atuais (CategoryRecord, TransactionRecord, queries Supabase)
components/             # Componentes de UI atuais a preservar/migrar futuramente (balance-card, transactions-list, ui/*)
app/globals.css         # Variáveis e estilos globais atuais
middleware.ts           # Lógica legada de autenticação
tsconfig.json          # Configuração TypeScript a ser ajustada para Vite
```

---

## 4. Escopo

### Está incluso
```
- Criação e ativação da branch de desenvolvimento `feat/v2-foundation`.
- Remoção completa da infraestrutura e arquivos legados do Next.js (diretório `app/`, `next.config.mjs`, `next-env.d.ts`, `middleware.ts` e dependências Next.js).
- Inicialização da estrutura frontend moderna com React 19 + Vite + TypeScript (com suporte PWA) gerenciada via `pnpm`.
- Manutenção estrita da fidelidade visual e de tokens de design de `specs/design-system.md` (Glassmorphism, paleta OKLCH, background blur, layout responsivo).
- Estruturação do diretório `/api` com HonoJS (BFF) configurado para execução compatível com Cloudflare Pages / Workers.
- Configuração de ferramentas centrais: Supabase CLI, Drizzle ORM (`drizzle-orm`, `drizzle-kit`) e Wrangler.
- Modelagem do schema do banco em Drizzle (`users`, `accounts`, `categories`, `transactions`, `pix_keys`) espelhando as entidades existentes.
- Configuração de pipeline de migrations via Supabase CLI e geração de tipagens TypeScript (`supabase gen types typescript`).
- Setup da infraestrutura de testes com Vitest cobrindo Frontend e BFF (HonoJS).
- Implementação de mocks para o Drizzle ORM garantindo que a execução de testes automatizados não realize queries nem modificações no banco de dados na nuvem.
- Testes automatizados iniciais passando (healthcheck, endpoints básicos mockados do Hono e casca inicial do React).
```

### Está fora do escopo
```
- Migração completa de dashboards e gráficos de despesas (Fase 2 - Fundação Visual).
- Fluxos avançados de autenticação visual e telas de perfil (Fase 2).
- Novos modais especializados de Receita, Despesa, Transferência e Carteira Pix (Fase 3).
- Integração de IA com Google Gemini e mensageria com Resend (Fase 4).
- Pipelines de CI/CD em produção via GitHub Actions.
```

---

## 5. Contratos

> Preencher apenas o que esta issue cria, altera ou consome.
> Adaptar ao tipo de interface do projeto (REST, GraphQL, RPC, eventos…).

### Endpoints / Mutations / Queries
```
GET    /api/health              # Health check do BFF (retorna { status: 'ok', timestamp: string, version: '2.0.0' })
GET    /api/v1/categories       # Lista de categorias ativas do usuário
GET    /api/v1/transactions     # Consulta de transações com suporte a filtros (month, year, limit, offset)
POST   /api/v1/transactions     # Criação de transação validada via Zod schema
DELETE /api/v1/transactions/:id # Exclusão de transação por id (UUID)
```

### Schema / Migrations
```sql
-- Definição relacional a ser espelhada no Drizzle ORM:
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense' | 'income'
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL, -- 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  key_value TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tipos gerados (se aplicável)
```bash
# Geração de tipagens oficiais do Supabase a partir do banco de dados na nuvem:
supabase gen types typescript --project-id <project-id> > src/types/database.types.ts

# Geração de migrations via Drizzle Kit:
pnpm drizzle-kit generate
```

---

## 6. Arquivos que Serão Criados ou Alterados

> O agente **não deve alterar** arquivos fora desta lista sem justificar
> com comentário `// SPEC-#<número>: <motivo>`.

```
CRIAR:
  vite.config.ts                     # Configuração do Vite com plugins React e PWA
  index.html                         # Entrypoint HTML SPA
  src/main.tsx                       # Inicialização do React 19
  src/App.tsx                        # Componente raiz da interface do usuário
  src/index.css                      # Implementação do design system (Glassmorphism, tokens OKLCH)
  src/types/database.types.ts        # Tipagens exportadas/espelhadas do Supabase
  api/index.ts                       # Entrypoint e roteador principal do BFF HonoJS para Cloudflare Pages
  api/src/db/schema.ts               # Schemas Drizzle ORM (Users, Accounts, Categories, Transactions, Pix_Keys)
  api/src/db/client.ts               # Conexão Drizzle ORM
  api/src/routes/health.ts           # Handler de health check
  api/src/routes/transactions.ts     # Handlers de listagem e criação de transações
  api/src/routes/categories.ts       # Handlers de listagem de categorias
  api/tests/setup.ts                 # Setup de testes e mocks do Drizzle ORM
  api/tests/health.spec.ts           # Teste unitário/integração do endpoint de health
  api/tests/transactions.spec.ts     # Teste das rotas de transações com Drizzle mockado
  src/tests/App.spec.tsx             # Teste de renderização da interface base
  drizzle.config.ts                  # Configuração do Drizzle Kit
  wrangler.toml                      # Configuração de deployment Cloudflare Pages / Workers
  vitest.config.ts                   # Configuração unificada de testes com Vitest

ALTERAR:
  package.json                       # Migração de dependências: substituição de Next por Vite, Hono, Drizzle, Vitest
  tsconfig.json                      # Configuração de paths (@/*) e compilação para Vite/React
  .gitignore                         # Atualização com dist/, .wrangler/, etc.
  specs/spec.md                      # Atualização da especificação técnica da issue

REMOVER:
  app/                               # Diretório raiz legado do Next.js (ações, páginas, layout)
  next.config.mjs                    # Configuração legada Next.js
  next-env.d.ts                      # Tipagens legadas Next.js
  middleware.ts                      # Middleware legado de rotas Next.js
```

---

## 7. Estratégia de Testes (TDD)

> Preencher antes de qualquer implementação.
> Consultar `specs/testing.md` para convenções do projeto.

### 🔴 Red — testes que devem falhar primeiro

> Descrever os testes que serão escritos ANTES da implementação.
> Cada critério de aceite deve ter ao menos um teste correspondente.

```
- `api/tests/health.spec.ts` → deve responder status 200 e json `{ status: "ok", version: "2.0.0" }` ao acessar `GET /api/health`
- `api/tests/transactions.spec.ts` → deve responder 200 e retornar array de transações mockadas pelo Drizzle em `GET /api/v1/transactions`
- `api/tests/transactions.spec.ts` → deve rejeitar payload inválido (amount negativo ou ausente) com status 400 em `POST /api/v1/transactions`
- `src/tests/App.spec.tsx` → deve renderizar a casca da aplicação Dinheirizz com aplicação de classes glassmorphism sem quebrar
```

### 🟢 Green — mínimo para os testes passarem

> O que precisa ser implementado para que cada teste acima passe.
> Sem over-engineering — apenas o suficiente.

```
- Criar a instância Hono no BFF com a rota `/api/health` retornando o status esperado.
- Configurar as rotas `/api/v1/transactions` no Hono com validação Zod e injeção do client Drizzle mockado.
- Configurar setup de mocks do Drizzle (`api/tests/setup.ts`) interceptando chamadas para que nenhuma query atinja a nuvem.
- Montar componente `App.tsx` com container estilizado pelo design system em `src/index.css`.
```

### 🔵 Refactor — oportunidades após o green

> O que pode ser melhorado depois que os testes passam,
> sem quebrar nenhum deles.

```
- Centralizar o middleware de tratamento de erros e formatação de respostas do Hono.
- Compartilhar schemas de validação Zod e tipos TypeScript entre frontend e backend BFF.
- Otimizar configurações de bundling do Vite e presets do PWA.
```

### Cobertura existente afetada

> Testes já existentes que tocam arquivos desta issue.
> Verificar que continuam passando após a implementação.

```
Nenhum teste existente nos arquivos em escopo.
```

---

## 8. Critérios de Aceite

> Copiar e adaptar da issue. Cada item deve ter correspondência na seção 7 (testes).

```
- [x] Nova branch `feat/v2-foundation` criada e ativa no repositório.
- [x] Remoção completa da infraestrutura legada do Next.js (`app/`, `next.config.mjs`, `next-env.d.ts`, `middleware.ts`).
- [x] Inicialização do projeto frontend em React com Vite (preparado para PWA) utilizando `pnpm`.
- [x] Fidelidade rigorosa aos tokens e estilos de `specs/design-system.md` preservada no frontend.
- [x] Servidor HonoJS (BFF) estruturado no diretório `/api` e configurado para Cloudflare Pages / Workers.
- [x] Drizzle ORM instalado e configurado via `drizzle.config.ts`.
- [x] Schemas das tabelas essenciais (Users, Accounts, Categories, Transactions, Pix_Keys) declarados no Drizzle.
- [x] Supabase CLI configurada para integração de migrations e geração de tipagens TypeScript.
- [x] Vitest configurado para execução de testes unitários e de integração.
- [x] Camada de Mocks do Drizzle ORM operacional, assegurando que nenhum teste execute operações na nuvem.
- [x] Testes automatizados do BFF e Frontend passando com sucesso (`pnpm test`).
```

<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->