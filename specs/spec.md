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
Documentação interna:      specs/design-system.md, specs/testing.md
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
## PC-6. MCPs Disponíveis

- MCP GitHub - Utilize-o como prioridade ao invés do Github CLI.

<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->

---
---

<!-- ═══ ISSUE CONTEXT — preenchido pelo generate-spec.md por issue ═══ -->

## 1. Identificação

```
Issue principal:    #5
Título:             [Fase 1.5] Configuração de Autenticação e Segurança (Supabase Auth)
Tipo:               feat
Branch:             feat/auth-supabase
Milestone:          Dinheirizz 2.0 - Fase 1.5
```

**Issues relacionadas**
```
#1  🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#2  [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Fundação de banco e stack)
#3  [Fase 2] Fundação Visual, Autenticação e Ações Rápidas (UI base, LoginScreen e Dashboard)
#8  [Fase 1.6] Autenticação Social via Google OAuth (Supabase Auth) (Sub-issue desacoplada)
#9  [Fase 1.7] Autenticação Social via Apple OAuth (Supabase Auth) (Sub-issue desacoplada)
```

---

## 2. Contexto

> O que esta spec cobre e por que existe.
> Referenciar a issue — não duplicar o conteúdo dela.

Esta especificação define a implementação da Fase 1.5 (#5) do Dinheirizz 2.0 para segurança e autenticação com Supabase Auth. Foca na configuração do fluxo de autenticação por E-mail e Senha (cadastro, login e gerenciamento de sessão no SPA), proteção e bloqueio visual com badge "Em breve" dos botões de login social (Google e Apple, cujas integrações completas foram transferidas para as issues #8 e #9 devido a dependências externas), e criação do Middleware no HonoJS para validação de JWT e injeção do `user_id` no contexto das requisições do BFF (`/api`).

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
specs/design-system.md  # Diretrizes de componentes visuais, tokens Glassmorphism e acessibilidade
specs/testing.md        # Convenções de TDD, Vitest e mocks do Drizzle ORM
```

### 3.2 Issues via MCP
```
#5 [Fase 1.5] Configuração de Autenticação e Segurança (Supabase Auth)
#1 🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap
#3 [Fase 2] Fundação Visual, Autenticação e Ações Rápidas (Dinheirizz 2.0)
#8 [Fase 1.6] Autenticação Social via Google OAuth (Supabase Auth)
#9 [Fase 1.7] Autenticação Social via Apple OAuth (Supabase Auth)
```

Ler PRs atrelados a cada issue:
- PR #4: `feat(v2): setup de infraestrutura, limpeza do legado e fundação inicial (Fase 1)` (mergeado em `main`).

### 3.3 Arquivos do repositório
```
src/lib/supabase.ts                  # Instância e configuração do Supabase client
src/contexts/AuthContext.tsx         # Contexto de autenticação e sessão do usuário
src/components/auth/LoginScreen.tsx  # Tela de login e botões de provedores sociais
api/index.ts                         # Ponto de entrada do backend BFF HonoJS
api/src/routes/transactions.ts       # Rotas de transação que devem ser protegidas
api/tests/setup.ts                   # Mocks e setup de testes do backend
```

---

## 4. Escopo

### Está incluso
```
- Configuração do cliente Supabase (@supabase/supabase-js) no frontend React.
- Provedor de autenticação por E-mail e Senha no AuthContext (login, cadastro, logout e recuperação de sessão).
- Adaptação do LoginScreen para exibir botões de Google e Apple em estado bloqueado/desabilitado com badge "Em breve" e feedback visual de cursor não-permitido.
- Criação do Middleware de autenticação no HonoJS (api/src/middlewares/auth.ts) para validação do Bearer JWT do Supabase.
- Injeção segura de user_id e objeto de usuário no contexto da requisição Hono (c.set('userId', ...)).
- Proteção das rotas privadas no BFF (/api/v1/transactions) rejeitando requisições não autenticadas com 401 Unauthorized.
- Atualização da rota POST /api/v1/transactions para gravar transações com o user_id real autenticado extraído do JWT.
- Criação de testes unitários e de integração no Vitest para o middleware Hono e para a tela de autenticação.
```

### Está fora do escopo
```
- Configuração e autorização OAuth 2.0 externa no Google Cloud Console (transferido para #8 - Fase 1.6).
- Configuração de certificados, Service ID e autenticação Apple no Apple Developer Portal (transferido para #9 - Fase 1.7).
- Recuperação avançada de senha ("Esqueci minha senha" com deep-link por e-mail).
- Alterações estruturais no banco de dados (o schema de users e transações já suporta user_id UUID).
```

---

## 5. Contratos

> Preencher apenas o que esta issue cria, altera ou consome.
> Adaptar ao tipo de interface do projeto (REST, GraphQL, RPC, eventos…).

### Endpoints / Mutations / Queries
```
# Headers obrigatórios em rotas protegidas do BFF:
Authorization: Bearer <supabase_access_token>

# Middleware de Autenticação Hono:
c.get('userId') -> string (UUID do auth.users)
c.get('user')   -> User

# Resposta de erro 401:
Status: 401 Unauthorized
Body: { "error": "Não autorizado", "message": "Token de autenticação ausente ou inválido" }

# Rotas protegidas pelo middleware:
GET    /api/v1/transactions
POST   /api/v1/transactions
DELETE /api/v1/transactions/:id

# Rotas públicas:
GET    /api/health
GET    /api/v1/categories
```

### Schema / Migrations
```sql
-- Nenhuma migration adicional necessária.
-- As tabelas já possuem a estrutura relacional com auth.users:
-- users (id UUID PRIMARY KEY REFERENCES auth.users(id))
-- transactions (user_id UUID NOT NULL REFERENCES auth.users(id))
```

### Tipos gerados (se aplicável)
```bash
# Tipos consolidados do Supabase em:
src/types/database.types.ts
```

---

## 6. Arquivos que Serão Criados ou Alterados

> O agente **não deve alterar** arquivos fora desta lista sem justificar
> com comentário `// SPEC-#<número>: <motivo>`.

```
CRIAR:
  api/src/middlewares/auth.ts                  # Middleware Hono de verificação de JWT do Supabase
  api/tests/auth-middleware.spec.ts            # Testes de integração do middleware de autenticação

ALTERAR:
  src/components/auth/LoginScreen.tsx          # Bloqueio dos botões Google/Apple com badge "Em breve"
  src/tests/Auth.spec.tsx                      # Atualização dos testes unitários para validar botões bloqueados
  api/index.ts                                 # Aplicação do middleware de autenticação nas rotas protegidas
  api/src/routes/transactions.ts               # Consumo do userId injetado pelo middleware
  api/tests/transactions.spec.ts               # Inclusão de Authorization header nos testes de rotas protegidas
  specs/spec.md                                # Atualização da especificação para Fase 1.5 (#5)
```

---

## 7. Estratégia de Testes (TDD)

> Preencher antes de qualquer implementação.
> Consultar `specs/testing.md` para convenções do projeto.

### 🔴 Red — testes que devem falhar primeiro

> Descrever os testes que serão escritos ANTES da implementação.
> Cada critério de aceite deve ter ao menos um teste correspondente.

```
- `api/tests/auth-middleware.spec.ts` → deve retornar 401 quando o header Authorization estiver ausente em rotas protegidas
- `api/tests/auth-middleware.spec.ts` → deve retornar 401 quando o token JWT for inválido ou malformado
- `api/tests/auth-middleware.spec.ts` → deve injetar userId no contexto e permitir o acesso quando o token for válido
- `src/tests/Auth.spec.tsx` → deve exibir botões de Google e Apple com a badge "Em breve" e com estado desabilitado (não disparando OAuth)
- `api/tests/transactions.spec.ts` → deve associar o registro criado ao userId autenticado recebido via JWT
```

### 🟢 Green — mínimo para os testes passarem

> O que precisa ser implementado para que cada teste acima passe.
> Sem over-engineering — apenas o suficiente.

```
- Implementar api/src/middlewares/auth.ts validando o JWT (usando supabase.auth.getUser ou verificação de claims) e atribuindo c.set('userId', user.id).
- Acoplar o middleware de auth nas rotas /api/v1/transactions em api/index.ts.
- Atualizar POST /api/v1/transactions para persistir com o userId do contexto.
- Ajustar LoginScreen.tsx adicionando a badge visual "Em breve", cursor-not-allowed e disabled={true} nos botões sociais.
```

### 🔵 Refactor — oportunidades após o green

> O que pode ser melhorado depois que os testes passam,
> sem quebrar nenhum deles.

```
- Centralizar o helper de extração de Bearer token para reutilização em futuros microsserviços.
- Adicionar tipos globais no Hono Env (Variables: { userId: string }) para autocomplete TypeScript estrito em todos os routers.
```

### Cobertura existente afetada

> Testes já existentes que tocam arquivos desta issue.
> Verificar que continuam passando após a implementação.

```
- `src/tests/Auth.spec.tsx` → testes de clique nos botões sociais precisam ser atualizados para testar estado bloqueado e badge
- `api/tests/transactions.spec.ts` → requisições aos endpoints protegidos devem incluir header de autorização mockado
- `api/tests/health.spec.ts` → rota pública que deve continuar funcionando sem autenticação
```

---

## 8. Critérios de Aceite

> Copiar e adaptar da issue. Cada item deve ter correspondência na seção 7 (testes).

```
- [x] Provedor de Email e Senha habilitado e funcional no cliente Supabase (AuthContext) permitindo cadastro, login e persistência de sessão.
- [x] Botões de login social via Google e Apple mantidos na interface de LoginScreen, porém bloqueados/desabilitados com feedback visual e badge "Em breve".
- [x] Tentativas de clique nos botões de Google e Apple não disparam chamadas OAuth.
- [x] Middleware no HonoJS (api/src/middlewares/auth.ts) valida o Bearer JWT enviado pelo Frontend nas requisições da pasta /api.
- [x] O user_id extraído do JWT é injetado no contexto da requisição (c.set('userId', ...)) e utilizado pelo Drizzle nas queries de transações.
- [x] Requisições para rotas protegidas sem token válido retornam status 401 Unauthorized.
- [x] Sub-issues complementares #8 (Google OAuth - Fase 1.6) e #9 (Apple OAuth - Fase 1.7) criadas e vinculadas à Issue #5.
- [x] Checkboxes de itens transferidos devidamente tachadas na Issue #5.
- [x] Todos os testes automatizados da aplicação passando no Vitest (`pnpm test`).
```
<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->

