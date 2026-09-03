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
Issue principal:    #3
Título:             [Fase 2] Fundação Visual, Autenticação e Ações Rápidas (Dinheirizz 2.0)
Tipo:               feat
Branch:             feat/v2-visual-foundation
Milestone:          Dinheirizz 2.0 - Fase 2
```

**Issues relacionadas**
```
#1  🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#2  [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial (Dependência concluída em #4)
```

---

## 2. Contexto

> O que esta spec cobre e por que existe.
> Referenciar a issue — não duplicar o conteúdo dela.

Esta especificação define a implementação da Fase 2 do Dinheirizz 2.0 conforme a Issue #3 e o Épico #1. Cobre a construção visual no frontend (React 19 SPA/PWA com Vite), incluindo o fluxo de Autenticação minimalista com Supabase Auth, o Dashboard Principal completo com saldo em destaque e listagem de movimentações, os Modais animados via Framer Motion (Transação com modos Receber, Despesa e Transferência) e o Modal de Carteira Pix com exibição e cópia de chaves, mantendo fidelidade estrita ao design system Glassmorphism.

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
specs/design-system.md  # Diretrizes visuais mandatórias (Glassmorphism Apple-inspired, tokens OKLCH, animações fluidas)
specs/testing.md        # Convenções de TDD e testes em React com Vitest e Testing Library
```

### 3.2 Issues via MCP
```
#3 [Fase 2] Fundação Visual, Autenticação e Ações Rápidas (Dinheirizz 2.0)
#1 🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap
#2 [Fase 1] Setup de Infraestrutura, Limpeza do Legado e Configuração Inicial
```

Ler PRs atrelados a cada issue:
- PR #4: `feat(v2): setup de infraestrutura, limpeza do legado e fundação inicial (Fase 1)` (mergeado em `main`).

### 3.3 Arquivos do repositório
```
src/index.css                      # Estilos base e classes Glassmorphism (.glass-card, .glass-sheet, orbs)
src/App.tsx                        # Casca visual atual a ser expandida para acomodar telas e modais
src/types/database.types.ts        # Tipos TypeScript oficiais sincronizados do Supabase
api/src/routes/transactions.ts     # Contratos e validação Zod dos endpoints de transações
api/src/routes/categories.ts       # Contratos de categorias
```

---

## 4. Escopo

### Está incluso
```
- Criação e ativação da branch de desenvolvimento `feat/v2-visual-foundation`.
- Camada de Autenticação Supabase no cliente (`src/lib/supabase.ts` e `src/contexts/AuthContext.tsx`) com suporte a Login por E-mail (Magic Link / Senha) e OAuth (Google / Apple), além de Logout.
- Componente de tela de Autenticação minimalista em Glassmorphism (`src/components/auth/LoginScreen.tsx`).
- Dashboard Principal estruturado (`src/components/dashboard/Dashboard.tsx`):
  - Card central de saldo com tipografia de alto destaque e indicador de variação percentual.
  - Seção de resumo com entradas e saídas do mês.
  - Listagem de últimas transações recentes com badges de categoria e valores coloridos (verde/vermelho).
- Barra de 4 Ações Rápidas (`src/components/dashboard/QuickActions.tsx`):
  - Receber (abre modal em modo 'income')
  - Despesa/Gastar (abre modal em modo 'expense')
  - Transferir (abre modal em modo 'transfer')
  - Pix (abre modal de carteira Pix)
- Modal Genérico de Transações (`src/components/modals/TransactionModal.tsx`) com animação slide-up via Framer Motion:
  - Input monetário formatado em BRL.
  - Descrição textual.
  - Seletor de categorias dinâmico.
  - Seletor de contas.
  - Datepicker de ocorrência da transação.
- Modal de Carteira Pix (`src/components/modals/PixWalletModal.tsx`):
  - Dropdown limpo de chaves Pix cadastradas do usuário.
  - Exibição de QR Code visual para recebimento.
  - Botão de ação rápida "Copiar Chave Pix" com feedback sonner/toast.
- Suíte de testes TDD com Vitest cobrindo fluxos de Auth, Dashboard, TransactionModal e PixWalletModal.
```

### Está fora do escopo
```
- Fluxos de IA Consultor Financeiro com Gemini (Fase 4).
- Disparos automáticos de e-mail e relatórios semanais com Resend (Fase 4).
- Gestão e criação de novas chaves Pix pelo usuário (Fase 3).
- Gráficos analíticos avançados de projeção e faturas de cartão de crédito (Fase 3).
```

---

## 5. Contratos

> Preencher apenas o que esta issue cria, altera ou consome.
> Adaptar ao tipo de interface do projeto (REST, GraphQL, RPC, eventos…).

### Endpoints / Mutations / Queries
```
# Endpoints consumidos pelo frontend no BFF HonoJS:
GET    /api/health              # Health check do BFF
GET    /api/v1/categories       # Lista de categorias para os seletores de transação
GET    /api/v1/transactions     # Consulta de histórico recente de transações
POST   /api/v1/transactions     # Criação de transações (Receita, Despesa, Transferência)
DELETE /api/v1/transactions/:id # Cancelamento/remoção de transação

# Supabase Auth Client:
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signInWithOAuth({ provider: 'google' | 'apple' })
supabase.auth.signOut()
supabase.auth.getSession()
```

### Schema / Migrations
```sql
-- Nenhum schema novo necessário para a Fase 2; as tabelas já foram criadas na Fase 1:
-- users, accounts, categories, transactions, pix_keys
```

### Tipos gerados (se aplicável)
```bash
# Tipagens já geradas e consolidadas em:
# src/types/database.types.ts
```

---

## 6. Arquivos que Serão Criados ou Alterados

> O agente **não deve alterar** arquivos fora desta lista sem justificar
> com comentário `// SPEC-#<número>: <motivo>`.

```
CRIAR:
  src/lib/supabase.ts                          # Client Supabase configurado com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
  src/contexts/AuthContext.tsx                 # Contexto de autenticação, sessão de usuário e helpers de login/logout
  src/components/auth/LoginScreen.tsx          # Tela de login minimalista com Glassmorphism
  src/components/dashboard/Dashboard.tsx       # Componente do Dashboard Principal (saldo e histórico)
  src/components/dashboard/QuickActions.tsx    # Barra com as 4 Ações Rápidas (Receber, Gastar, Transferir, Pix)
  src/components/modals/TransactionModal.tsx   # Modal de criação de transação animado com Framer Motion (slide-up)
  src/components/modals/PixWalletModal.tsx     # Modal de Carteira Pix com seleção de chave, QR Code e cópia
  src/tests/Auth.spec.tsx                      # Teste unitário do fluxo e contexto de autenticação
  src/tests/Dashboard.spec.tsx                 # Teste do Dashboard e renderização de saldo/transações
  src/tests/TransactionModal.spec.tsx          # Teste do modal de transações (inputs, validações e alternância de modos)
  src/tests/PixWalletModal.spec.tsx            # Teste da carteira Pix (seleção de chave e cópia)

ALTERAR:
  src/App.tsx                                  # Integração do AuthContext, roteamento condicional (Login vs Dashboard) e modais
  specs/spec.md                                # Preenchimento do ISSUE CONTEXT para a Issue #3
```

---

## 7. Estratégia de Testes (TDD)

> Preencher antes de qualquer implementação.
> Consultar `specs/testing.md` para convenções do projeto.

### 🔴 Red — testes que devem falhar primeiro

> Descrever os testes que serão escritos ANTES da implementação.
> Cada critério de aceite deve ter ao menos um teste correspondente.

```
- `src/tests/Auth.spec.tsx` → deve renderizar formulário de login com campos de e-mail e botões sociais (Google/Apple) quando usuário deslogado
- `src/tests/Dashboard.spec.tsx` → deve exibir saldo total e lista de transações recentes formatadas quando usuário autenticado
- `src/tests/TransactionModal.spec.tsx` → deve abrir em modo "Receita" ao clicar em Receber e submeter dados válidos para a API
- `src/tests/TransactionModal.spec.tsx` → deve abrir em modo "Despesa" ao clicar em Gastar e validar que valor não pode ser zero
- `src/tests/PixWalletModal.spec.tsx` → deve exibir chave Pix selecionada, imagem/representação do QR code e disparar cópia para a área de transferência
```

### 🟢 Green — mínimo para os testes passarem

> O que precisa ser implementado para que cada teste acima passe.
> Sem over-engineering — apenas o suficiente.

```
- Implementar AuthContext com mock de sessão em testes e integração real com Supabase Auth em produção.
- Criar componente LoginScreen com estética Glassmorphism.
- Implementar Dashboard exibindo saldo e consumindo a lista de transações.
- Criar QuickActions despachando eventos de abertura dos modais correspondentes.
- Criar TransactionModal com Framer Motion (AnimatePresence) e formulário com validação.
- Criar PixWalletModal exibindo dados da chave Pix e simulando QR Code.
```

### 🔵 Refactor — oportunidades após o green

> O que pode ser melhorado depois que os testes passam,
> sem quebrar nenhum deles.

```
- Extrair formatadores de moeda e data para utilitários reutilizáveis em `src/lib/formatters.ts`.
- Otimizar acessibilidade (ARIA labels e focus trap) nos modais com Framer Motion.
```

### Cobertura existente afetada

> Testes já existentes que tocam arquivos desta issue.
> Verificar que continuam passando após a implementação.

```
- `api/tests/health.spec.ts` → Healthcheck do backend
- `api/tests/transactions.spec.ts` → Contratos de rotas do BFF
- `src/tests/App.spec.tsx` → Renderização inicial da casca do aplicativo
```

---

## 8. Critérios de Aceite

> Copiar e adaptar da issue. Cada item deve ter correspondência na seção 7 (testes).

```
- [x] Nova branch `feat/v2-visual-foundation` criada a partir de `main`.
- [x] Tela de Autenticação minimalista com Supabase Auth construída em Glassmorphism.
- [x] Área do Dashboard Principal exibindo saldo em destaque e listagem das últimas movimentações.
- [x] Área de Ações Rápidas com 4 botões direcionados: Receber, Despesa (Gastar), Transferir e Pix.
- [x] Modal de Transações construído com efeito slide-up (Framer Motion) suportando valores, descrição, categorias, contas e data.
- [x] Modal de Carteira Pix com dropdown de chave, visualização de QR Code e botão "Copiar Chave".
- [x] Testes no Vitest escritos e cobrindo os componentes da interface em TDD.
- [x] Fidelidade visual ao `specs/design-system.md` (Glassmorphism, tokens OKLCH e dark theme).
- [x] Todos os testes automatizados passando com sucesso (`pnpm test`).
```

<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->

