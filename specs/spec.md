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
Issue principal:    #13
Título:             [Fase 1.8] Hardening de Autenticação: Validação Avançada de Cadastro, Confirmação de Senha e Ofuscação de Payload (BFF)
Tipo:               feat
Branch:             feat/auth-hardening
Milestone:          Dinheirizz 2.0 - Fase 1.8
```

**Issues relacionadas**
```
#1  🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#2  [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Fundação de banco e stack)
#5  [Fase 1.5] Configuração de Autenticação e Segurança (Supabase Auth) (Issue base)
#8  [Fase 1.6] Autenticação Social via Google OAuth (Supabase Auth) (Sub-issue irmã beneficiada)
#9  [Fase 1.7] Autenticação Social via Apple OAuth (Supabase Auth) (Sub-issue irmã beneficiada)
#12 PR :sparkles: feat(auth): configuração de autenticação, segurança (Supabase Auth) e revisão de responsividade mobile (PR da Fase 1.5)
```

---

## 2. Contexto

> O que esta spec cobre e por que existe.
> Referenciar a issue — não duplicar o conteúdo dela.

Esta especificação define o endurecimento (*hardening*) de segurança e aprimoramento da experiência de onboarding do usuário no Dinheirizz 2.0 (Issue #13). Abrange validação estrita com schemas Zod para cadastro e login, inclusão de campos de Nome Completo, Confirmação de Senha e Handle/Username com validação em tempo real, adição de headers de segurança HTTP e sanitização de payloads no BFF HonoJS para eliminar exposição de dados desnecessários nos DevTools, e preparação antecipada do banco de dados (`users`) e rotas do BFF (`/api/v1/users/sync` e `/api/v1/users/me`) para recepcionar de forma transparente os dados dos futuros logins sociais de Google (#8) e Apple (#9).

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
specs/design-system.md  # Diretrizes de componentes visuais, Glassmorphism e Apple HIG (44px touch targets)
specs/testing.md        # Pirâmide de testes, convenções do Vitest e mocks do Drizzle ORM
```

### 3.2 Issues via MCP
```
#13 [Fase 1.8] Hardening de Autenticação: Validação Avançada de Cadastro, Confirmação de Senha e Ofuscação de Payload (BFF)
#1  🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap
#5  [Fase 1.5] Configuração de Autenticação e Segurança (Supabase Auth)
#8  [Fase 1.6] Autenticação Social via Google OAuth (Supabase Auth)
#9  [Fase 1.7] Autenticação Social via Apple OAuth (Supabase Auth)
```

Ler PRs atrelados a cada issue:
- PR #12: `feat(auth): configuração de autenticação, segurança (Supabase Auth) e revisão de responsividade mobile` (Fase 1.5).

### 3.3 Arquivos do repositório
```
api/src/db/schema.ts                 # Schema das tabelas no Drizzle ORM (users, accounts, transactions)
api/src/middlewares/auth.ts          # Middleware Hono de verificação de Bearer JWT do Supabase
api/index.ts                         # Entrypoint da API Hono e middlewares globais
src/contexts/AuthContext.tsx         # Contexto de autenticação e comunicação com Supabase Auth SDK
src/components/auth/LoginScreen.tsx  # Interface de formulário de login e cadastro
src/lib/supabase.ts                  # Instância configurada do cliente Supabase
```

---

## 4. Escopo

### Está incluso
```
- Criação de schemas de validação Zod compartilhados para formulários de autenticação (email, password com força mínima, confirmPassword com match exato, fullName e username).
- Enriquecimento visual do formulário de cadastro na LoginScreen:
  - Campo "Nome Completo" (mínimo 3 caracteres).
  - Campo "Identificador / Handle" (@username único, caracteres alfanuméricos em minúsculas).
  - Campo "Confirmação de Senha" com feedback visual imediato de correspondência (match/mismatch).
  - Indicador dinâmico de força da senha (mínimo 8 caracteres, contendo letras e números).
- Propagação dos metadados de perfil (fullName, username) no Supabase Auth através de options.data no método signUp do AuthContext.
- Evolução do schema Drizzle da tabela `users` (api/src/db/schema.ts):
  - Adição da coluna `username: text('username').unique()`.
  - Adição da coluna `provider: text('provider').default('email')`.
  - Adição da coluna `updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()`.
- Criação do router de usuários no BFF HonoJS (api/src/routes/users.ts):
  - POST /api/v1/users/sync: Endpoint protegido para criação/sincronização resiliente (upsert) do perfil de usuário a partir do token JWT e metadados, preparando o terreno do BFF e BD para receber automaticamente os logins com Google e Apple.
  - GET /api/v1/users/me: Endpoint protegido que retorna o perfil do usuário logado de forma limpa e sanitizada.
- Inclusão de Headers de Segurança HTTP (secureHeaders) no BFF HonoJS contra clickjacking, sniffing de MIME e ataques de injeção.
- Sanitização de respostas de API garantindo que senhas, tokens internos ou dados sensíveis nunca sejam expostos no payload de resposta aos DevTools do navegador.
- Criação de suíte de testes automatizados no Vitest (TDD) para os novos schemas, endpoints do BFF e fluxo de validação no formulário.
- Registro de comentários nas issues #8 (Google) e #9 (Apple) documentando a preparação de BD e endpoints realizada.
```

### Está fora do escopo
```
- Ativação das credenciais OAuth externas no Google Cloud Console e Apple Developer Portal (escopo restrito a #8 e #9).
- Fluxo de recuperação de senha por e-mail ("Esqueci minha senha").
- Autenticação de dois fatores (2FA/MFA via SMS ou TOTP).
```

---

## 5. Contratos

### Endpoints / Mutations / Queries
```
# Headers obrigatórios em rotas protegidas:
Authorization: Bearer <supabase_access_token>

# POST /api/v1/users/sync
# Cria ou sincroniza os dados do perfil após autenticação (email/senha ou OAuth futuro)
Request Body (opcional):
```
{
  "fullName"?: string,
  "username"?: string,
  "avatarUrl"?: string,
  "provider"?: "email" | "google" | "apple"
}
Response 200 OK:
{
  "user": {
    "id": "uuid",
    "email": "user@email.com",
    "fullName": "Nome do Usuário",
    "username": "usuario",
    "avatarUrl": "https://...",
    "provider": "email",
    "providers": ["email", "google"],
    "createdAt": "2026-09-08T...",
    "updatedAt": "2026-09-08T..."
  }
}

# GET /api/v1/users/me
# Retorna o perfil sanitizado do usuário logado
Response 200 OK:
{
  "user": {
    "id": "uuid",
    "email": "user@email.com",
    "fullName": "Nome do Usuário",
    "username": "usuario",
    "avatarUrl": "https://...",
    "provider": "email",
    "providers": ["email"],
    "createdAt": "2026-09-08T..."
  }
}

# Resposta de erro 400 (Bad Request - Zod Validation):
Status: 400 Bad Request
Body:
{
  "error": "Dados inválidos",
  "details": [
    { "field": "confirmPassword", "message": "As senhas não coincidem" }
  ]
}

# Resposta de erro 401 (Unauthorized):
Status: 401 Unauthorized
Body:
{
  "error": "Não autorizado",
  "message": "Token de autenticação ausente ou inválido"
}
```

### Schema / Migrations
```sql
-- Alterações na tabela users para enriquecimento de perfil, suporte a OAuth e unificação de contas multi-provedores
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS providers TEXT[] DEFAULT ARRAY['email']::TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Tipos gerados (se aplicável)
```bash
# Schema Drizzle atualizado diretamente em:
api/src/db/schema.ts
```

---

## 6. Arquivos que Serão Criados ou Alterados

```
CRIAR:
  src/schemas/auth.ts                  # Schemas Zod de validação de formulários de Login e Cadastro
  api/src/schemas/auth.ts              # Schemas Zod de validação para endpoints do BFF
  api/src/routes/users.ts              # Rotas GET /me e POST /sync do usuário no HonoJS
  api/tests/users.spec.ts              # Testes de integração das rotas de usuário e sincronização
  src/tests/AuthValidation.spec.tsx    # Testes unitários do formulário de cadastro com novos campos e validações

ALTERAR:
  api/src/db/schema.ts                 # Adição das colunas username, provider e updatedAt na tabela users
  api/index.ts                         # Registro de secureHeaders e acoplamento do router /v1/users
  api/tests/setup.ts                   # Atualização dos mocks do Drizzle para suportar a tabela users e sync
  src/contexts/AuthContext.tsx         # Suporte ao envio de metadados (fullName, username) no signUp
  src/components/auth/LoginScreen.tsx  # Inclusão dos campos Nome, Username e Confirmação de Senha com validação dinâmica
  src/tests/Auth.spec.tsx              # Adequação dos testes de renderização e submissão
  specs/spec.md                        # Esta especificação técnica
  specs/plan.md                        # Plano de implementação detalhado (Red-Green-Refactor)
```

---

## 7. Estratégia de Testes (TDD)

### 🔴 Red — testes que devem falhar primeiro

```
- `src/tests/AuthValidation.spec.tsx` → deve rejeitar cadastro quando as senhas não forem idênticas, exibindo mensagem de erro visual
- `src/tests/AuthValidation.spec.tsx` → deve exigir que a senha tenha no mínimo 8 caracteres com letras e números
- `src/tests/AuthValidation.spec.tsx` → deve exigir Nome Completo com no mínimo 3 caracteres no formulário de cadastro
- `src/tests/AuthValidation.spec.tsx` → deve sanitizar e validar o formato do handle/username (apenas letras minúsculas, números, ponto ou underline)
- `api/tests/users.spec.ts` → GET /api/v1/users/me deve retornar 401 quando o token Authorization estiver ausente
- `api/tests/users.spec.ts` → POST /api/v1/users/sync deve realizar upsert do perfil do usuário associando o userId autenticado e metadados de provider (email/google/apple)
- `api/tests/users.spec.ts` → GET /api/v1/users/me deve retornar os dados do usuário sanitizados sem expor credenciais ou tokens
```

### 🟢 Green — mínimo para os testes passarem

```
- Implementar src/schemas/auth.ts e api/src/schemas/auth.ts com validações Zod estritas e amigáveis em português.
- Evoluir a tabela `users` em api/src/db/schema.ts com as colunas `username`, `provider` e `updatedAt`.
- Criar api/src/routes/users.ts com os endpoints `/sync` e `/me` protegidos por `authMiddleware`.
- Adicionar `secureHeaders()` no `api/index.ts`.
- Atualizar `LoginScreen.tsx` para apresentar os novos campos no modo cadastro com indicadores de correspondência de senha.
- Atualizar `AuthContext.tsx` repassando os metadados no `signUp`.
```

### 🔵 Refactor — oportunidades após o green

```
- Modularizar componentes de feedback visual de força de senha e match.
- Assegurar que os estilos dos novos campos respeitem rigorosamente o Glassmorphism e as áreas de toque mínimas de 44px (Apple HIG).
```

### Cobertura existente afetada

```
- `src/tests/Auth.spec.tsx` → testes de alternância de abas e submissão de cadastro devem considerar os novos campos obrigatórios.
- `api/tests/auth-middleware.spec.ts` → continua passando sem alterações (base comum de autenticação).
- `api/tests/transactions.spec.ts` → continua passando sem alterações.
```

---

## 8. Critérios de Aceite

```
- [ ] Formulário de cadastro atualizado contendo os campos: Nome Completo, Username/Handle, E-mail, Senha e Confirmação de Senha.
- [ ] Validação dinâmica com feedback visual em tempo real para correspondência exata entre Senha e Confirmação de Senha.
- [ ] Validação de força de senha (mínimo de 8 caracteres, pelo menos uma letra e um número) e bloqueio de envio com dados inválidos.
- [ ] Os metadados de cadastro (Nome Completo e Username) são persistidos no Supabase Auth (`raw_user_meta_data`).
- [ ] Tabela `users` do Drizzle ORM atualizada com colunas `username`, `provider` e `updated_at`.
- [ ] Endpoint `POST /api/v1/users/sync` implementado e protegido, permitindo sincronização/upsert de usuários locais a partir de tokens JWT do Supabase (incluindo metadados de Google e Apple).
- [ ] Endpoint `GET /api/v1/users/me` implementado retornando o perfil do usuário logado de forma sanitizada.
- [ ] Headers de segurança HTTP (`secureHeaders`) ativados no backend BFF HonoJS.
- [ ] Comentários de documentação técnica publicados nas issues #8 e #9 explicando a infraestrutura pronta para ingestão de OAuth.
- [ ] 100% dos testes automatizados passando no Vitest (`pnpm test`) e build de produção limpo (`pnpm build`).
```
<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->

