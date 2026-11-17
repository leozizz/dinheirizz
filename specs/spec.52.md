# spec.52.md
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
Linguagem:      TypeScript 5 (Strict Mode)
Build:          Vite 6 + VitePWA
Estilização:    Tailwind CSS v4 + Vanilla CSS Tokens OKLCH (Dual-Theme & Glassmorphism)
Componentes:    Radix UI / shadcn/ui + Design System Próprio
Roteamento:     React Router / SPA Routing
Estado:         React Context / Custom Hooks + TanStack React Query v5
Armazenamento:  WebCrypto AES-GCM (encryptedStorageAdapter)
```

### Backend
```
Framework:      Hono.js 4 (/api)
Runtime:        Cloudflare Pages Functions / Workers (Edge)
Linguagem:      TypeScript 5 (Strict Mode)
Autenticação:   Supabase Auth (JWT Bearer)
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
playwright      # Playwright CLI para testes E2E headless
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
│   ├── contexts/   # Contextos de autenticação, tema e estado global
│   ├── hooks/      # Custom React hooks
│   ├── lib/        # Utilitários, WebCrypto, parsers e instâncias de clientes
│   ├── types/      # Tipagens TypeScript e database.types.ts
│   └── tests/      # Testes unitários do frontend (Vitest + Testing Library)
├── e2e/            # Suíte de testes End-to-End automatizados (Playwright)
├── specs/          # Especificações SDD (spec.*.md, plan.*.md, testing.md, design-system.md)
└── public/         # Assets estáticos, manifest PWA, ícones
```

---

## PC-4. Convenções do Projeto

```
Nomenclatura de branches:  feat/{id}-{slug}, fix/{id}-{slug}, test/{id}-{slug}
Padrão de commits:         Conventional Commits (feat:, fix:, chore:, refactor:, test:)
Localização de testes:     api/tests/*.spec.ts, src/tests/*.spec.tsx, e2e/*.spec.ts
Variáveis de ambiente:     .env, .env.local, .env.example
Documentação interna:      specs/design-system.md, specs/testing.md, AGENTS.md, STANDARDS.md
```

---

## PC-5. Restrições Permanentes do Projeto

```
- Sem `any` em TypeScript — strict mode obrigatório em todo o repositório
- Uso estrito de Arrow Functions (`const fn = () => {}`) em componentes e lógica de negócio
- Dual-Theme oficial obrigatório: Dark Luxury (#0d0e12 + Neon Lime) e Light Clean
- Fidelidade visual estrita a specs/design-system.md (OKLCH, Glassmorphism, Dual-Theme)
- Proibido o uso de `!important` no CSS — respeitar especificidade e tokens semânticos
- data-testid obrigatório em todos os botões, campos de entrada, seletores interativos e modais
- Proibido executar queries destrutivas ou migrações reais em nuvem durante testes automatizados
- Backend BFF alocado exclusivamente no diretório /api utilizando HonoJS
- Isolamento de runtime: proibido importar node:fs, path ou crypto do Node em src/; utilizar crypto.subtle
- Gerenciamento de pacotes estritamente com pnpm
- Sem console.log em código de produção e sem blocos catch vazios
- Acessibilidade e áreas de toque com mínimo de 44x44px (Apple HIG / WCAG 2.1 AA)
- Sem overflow horizontal (scrollWidth <= innerWidth) em viewports mobile (375px/390px), tablet (768px) e desktop (1280px+)
- Codificação nativa UTF-8 em todos os textos, comentários e documentações (zero mojibake)
```

## PC-6. MCPs Disponíveis

- MCP GitHub - Operações de Issues, PRs e consultas Git.
- MCP Playwright - Inspeção de layout, responsividade mobile/desktop e validação visual de temas.

<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->

---
---

<!-- ═══ ISSUE CONTEXT — preenchido pelo generate-spec.md por issue ═══ -->

## 1. Identificação

```
Issue principal:    #52
Título:             test(e2e): Configuração de Suíte Automatizada End-to-End com Playwright Headless
Tipo:               test
Branch:             feat/52-playwright-e2e
Milestone:          Dinheirizz 2.0 - Qualidade & Automação E2E
```

**Issues relacionadas**
```
#1   🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#13  [Fase 1.8] Hardening de Autenticação: Validação Avançada de Cadastro, Confirmação de Senha e Ofuscação de Payload
#31  [Fase 3.2] Metas e Envelopes de Gastos: Criação de Orçamentos por Categoria com Barras de Progresso
#51  [Fase 5.1] Otimização Extrema de Performance: Virtualização de Feed e React 19 Compiler Readiness
```

---

## 2. Contexto

Esta especificação define a implantação completa e padronizada da **Suíte de Testes End-to-End (E2E) Automatizada com Playwright Headless** no projeto Dinheirizz (Issue #52 / Paperclip LEO-58).

A aplicação possui alta interatividade com recursos financeiros críticos: transição entre Landing/Boas-vindas e Login, navegação por Modo Demonstração e Autenticado, criação e conciliação de transações (receitas, despesas e transferências), monitoramento dinâmico de saldo no Dashboard e envelopes orçamentários por categoria. 

Para assegurar estabilidade contínua no CI e no fluxo de desenvolvimento, esta suíte automatizará três jornadas fundamentais do usuário:
1. **Autenticação, Redirecionamento e Dual-Theme:** Acesso via WelcomeScreen, abertura da tela de login, alternância entre abas de Login e Cadastro, validação de redirecionamento para o Dashboard via Modo Demonstração e toggle de temas visuais (`Dark Luxury` / `Light Clean`).
2. **Registro de Nova Transação e Atualização de Saldo:** Abertura do modal de transação (`TransactionModal`) via ação rápida no Dashboard, preenchimento de valor, descrição e categoria, submissão da transação, confirmação por toast e verificação imediata da atualização do saldo principal no Dashboard.
3. **Criação e Monitoramento de Envelopes de Orçamento:** Abertura do modal de orçamento (`BudgetModal`) a partir do widget no Dashboard, definição/edição de limites para categorias (ex: Alimentação), salvamento e validação do progresso e status visual dos envelopes renderizados no Dashboard.

A suíte será configurada para rodar localmente e em CI com servidor Vite integrado (`http://localhost:3000`), suporte a viewports Desktop e Mobile e total conformidade com a política Anti-Slop e estrita ausência de overflow horizontal.

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
specs/design-system.md  # Tokens semânticos, Glassmorphism, temas Dark Luxury e Light Clean
specs/testing.md        # Pirâmide de testes e padrões de asserção
AGENTS.md               # Regras de Ouro: data-testid obrigatórios, responsividade, arrow functions
STANDARDS.md            # Padrões mecânicos validados pelo tools/agent-standards
```

### 3.2 Arquivos do repositório a inspecionar
```
vite.config.ts                                      # Configuração do Vite dev server (porta 3000) e plugin Hono
package.json                                        # Scripts de teste e devDependencies
src/App.tsx                                         # Orquestração de rotas, AuthContext, demo state e modais
src/components/auth/WelcomeScreen.tsx               # Landing page inicial com botões de login e demo
src/components/auth/LoginScreen.tsx                 # Formulário de login/cadastro com abas e validações
src/components/dashboard/Dashboard.tsx              # Dashboard principal, exibição de saldo e orçamentos
src/components/dashboard/QuickActions.tsx           # Botões de ação rápida (receita, despesa, transfer, etc.)
src/components/dashboard/BudgetProgressWidget.tsx   # Widget de envelopes de gastos no Dashboard
src/components/modals/TransactionModal.tsx          # Modal de criação de transação financeira
src/components/modals/BudgetModal.tsx               # Modal de configuração de orçamentos por categoria
```

---

## 4. Escopo

### Está incluso
```
- Instalação e configuração de `@playwright/test` como dependência de desenvolvimento no package.json.
- Criação do arquivo de configuração `playwright.config.ts`:
  - `webServer` apontando para o servidor Vite (`pnpm dev`, porta 3000, reutilização fora do CI).
  - `baseURL`: `http://localhost:3000`.
  - Execução headless por padrão.
  - Projetos multi-dispositivo configurados:
    - Desktop Chromium (1280x800)
    - Mobile Chromium / Mobile Viewport (390x844 - iPhone / Pixel standard)
  - Artefatos de depuração (screenshots apenas em falha, traces em first-retry).
- Adição dos scripts no `package.json`:
  - `"test:e2e": "playwright test"`
  - `"test:e2e:ui": "playwright test --ui"`
  - `"test:e2e:report": "playwright show-report"`
- Enriquecimento de `data-testid` nos componentes para seletores 100% determinísticos:
  - `src/components/auth/LoginScreen.tsx`:
    - `data-testid="auth-fullname-input"`
    - `data-testid="auth-username-input"`
    - `data-testid="auth-email-input"`
    - `data-testid="auth-password-input"`
    - `data-testid="auth-confirm-password-input"`
  - `src/components/modals/TransactionModal.tsx`:
    - `data-testid="transaction-amount-input"`
    - `data-testid="transaction-description-input"`
  - `src/components/dashboard/Dashboard.tsx`:
    - `data-testid="main-balance-value"`
- Criação dos testes E2E no diretório `e2e/`:
  - `e2e/auth.spec.ts`:
    - Teste 1: Navegação da tela de boas-vindas para tela de login e alternância de abas (Entrar / Criar Conta).
    - Teste 2: Entrada direta no Dashboard através do botão de Modo Demonstração (`welcome-demo-btn`).
    - Teste 3: Alternância de tema (`header-theme-toggle-btn` e `landing-theme-toggle-btn`) validando presença da classe `dark` ou ausência correspondente no elemento `html`.
    - Teste 4: Ausência de overflow horizontal (`document.documentElement.scrollWidth <= window.innerWidth`).
  - `e2e/transactions.spec.ts`:
    - Teste 1: Abertura do modal de transação através da ação rápida de Receita (`quick-action-income`).
    - Teste 2: Registro de nova receita com preenchimento de valor e descrição, submissão e verificação do toast de sucesso.
    - Teste 3: Atualização do valor do saldo principal (`main-balance-value`) e presença da transação na lista recente.
    - Teste 4: Abertura e registro de despesa (`quick-action-expense`), validando o abatimento correspondente no saldo.
  - `e2e/budgets.spec.ts`:
    - Teste 1: Abertura do modal de orçamento a partir do widget no Dashboard (`open-budget-modal-btn`).
    - Teste 2: Configuração de limite para categoria (`input-budget-cat-1` / `btn-save-budget-cat-1`), salvamento e fechamento.
    - Teste 3: Renderização do envelope correspondente no Dashboard (`budget-envelope-cat-1` ou widget de progresso).
- Garantia de que todos os testes rodam em modo headless sem falhas e sem travar processos no Windows ou Linux.
```

### Está fora do escopo
```
- Testes E2E de provedores de autenticação externa reais (Google OAuth / Apple OAuth em produção).
- Mocks complexos de câmera física para leitura OCR de comprovantes no Playwright (já coberto por testes unitários).
- Reescrita ou substituição da suíte de testes unitários do Vitest (`pnpm test`).
```

---

## 5. Contratos e Configurações

### 5.1 Configuração do Playwright (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 }
      }
    }
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
```

### 5.2 Contratos de `data-testid` Adicionais
| Componente | Elemento | data-testid | Descrição |
| :--- | :--- | :--- | :--- |
| `src/components/auth/LoginScreen.tsx` | Input de Nome Completo | `auth-fullname-input` | Campo de texto para nome no cadastro |
| `src/components/auth/LoginScreen.tsx` | Input de Username | `auth-username-input` | Campo de texto para @handle no cadastro |
| `src/components/auth/LoginScreen.tsx` | Input de E-mail | `auth-email-input` | Campo de entrada de email (login/cadastro) |
| `src/components/auth/LoginScreen.tsx` | Input de Senha | `auth-password-input` | Campo de senha (login/cadastro) |
| `src/components/auth/LoginScreen.tsx` | Input de Confirmação | `auth-confirm-password-input` | Campo de confirmação de senha no cadastro |
| `src/components/modals/TransactionModal.tsx` | Input de Valor | `transaction-amount-input` | Entrada monetária principal |
| `src/components/modals/TransactionModal.tsx` | Input de Descrição | `transaction-description-input` | Descrição textual da movimentação |
| `src/components/dashboard/Dashboard.tsx` | Heading H2 do Saldo | `main-balance-value` | Exibição numérica do saldo principal ativo |

---

## 6. Arquivos que Serão Criados ou Alterados

```
CRIAR:
  playwright.config.ts                      # Configuração central da suíte E2E Playwright
  e2e/auth.spec.ts                          # Testes E2E de Welcome, Login, Demo e Dual-Theme
  e2e/transactions.spec.ts                  # Testes E2E de cadastro de transação e impacto no saldo
  e2e/budgets.spec.ts                       # Testes E2E de envelopes de orçamento e progresso

ALTERAR:
  package.json                              # Inclusão de @playwright/test em devDependencies e scripts test:e2e*
  src/components/auth/LoginScreen.tsx       # Inclusão de data-testid nos inputs de formulário
  src/components/modals/TransactionModal.tsx # Inclusão de data-testid nos inputs de valor e descrição
  src/components/dashboard/Dashboard.tsx     # Inclusão de data-testid="main-balance-value" no saldo principal
  specs/spec.52.md                          # Esta especificação técnica SDD
```

---

## 7. Estratégia de Testes (TDD / E2E)

### 🔴 Red — testes que devem falhar antes da configuração / ajustes
```
- `pnpm test:e2e` → Falha por ausência do script 'test:e2e' e do pacote '@playwright/test'.
- `e2e/auth.spec.ts` → Falha ao tentar localizar 'auth-email-input' e 'auth-password-input' por data-testid caso os inputs ainda não contenham o atributo.
- `e2e/transactions.spec.ts` → Falha ao tentar preencher 'transaction-amount-input' ou verificar 'main-balance-value' caso os atributos estejam ausentes.
```

### 🟢 Green — mínimo para os testes passarem
```
- Instalar `@playwright/test` via `pnpm add -D @playwright/test` e instalar os browsers necessários (`pnpm exec playwright install chromium`).
- Criar `playwright.config.ts` apontando para `http://localhost:3000` com webServer `pnpm dev`.
- Adicionar scripts no `package.json` (`"test:e2e": "playwright test"`).
- Adicionar os `data-testid` requeridos em `LoginScreen.tsx`, `TransactionModal.tsx` e `Dashboard.tsx`.
- Implementar as specs em `e2e/auth.spec.ts`, `e2e/transactions.spec.ts` e `e2e/budgets.spec.ts`.
- Executar `pnpm test:e2e` e assegurar que 100% dos testes passem em modo headless.
```

### 🔵 Refactor — melhorias após o green
```
- Parametrizar helpers reutilizáveis em `e2e/helpers/` caso surjam rotinas repetitivas de navegação.
- Assegurar que os testes não deixem estados persistentes indesejados ou processos suspensos na porta 3000.
- Validar conformidade de lint, tipagem estrita TypeScript e `pnpm standards:review`.
```

---

## 8. Critérios de Aceite

```
- [ ] O pacote `@playwright/test` está registrado em `devDependencies` no `package.json`.
- [ ] O script `"test:e2e": "playwright test"` está configurado no `package.json`.
- [ ] O arquivo `playwright.config.ts` está configurado com `baseURL: 'http://localhost:3000'`, `webServer` automatizado (`pnpm dev`) e projetos Desktop e Mobile Chromium.
- [ ] Os inputs de formulário em `LoginScreen.tsx` possuem `data-testid` (`auth-fullname-input`, `auth-username-input`, `auth-email-input`, `auth-password-input`, `auth-confirm-password-input`).
- [ ] Os campos de entrada em `TransactionModal.tsx` possuem `data-testid` (`transaction-amount-input`, `transaction-description-input`).
- [ ] O elemento de saldo principal em `Dashboard.tsx` possui `data-testid="main-balance-value"`.
- [ ] A suíte `e2e/auth.spec.ts` cobre navegação WelcomeScreen ➔ LoginScreen, alternância de abas, entrada no Modo Demonstração e toggle Dual-Theme (Dark Luxury / Light Clean).
- [ ] A suíte `e2e/transactions.spec.ts` cobre abertura de modal de transação, registro de movimentação e atualização do saldo no Dashboard.
- [ ] A suíte `e2e/budgets.spec.ts` cobre abertura de modal de orçamento, definição de teto para categoria e exibição do envelope no widget do Dashboard.
- [ ] Nenhuma violação de responsividade: os testes E2E em viewport mobile confirmam ausência de overflow horizontal (`scrollWidth <= innerWidth`).
- [ ] A suíte de testes unitários existente no Vitest (`pnpm test`) continua com 100% de sucesso.
- [ ] O build de produção (`pnpm build`) executa sem erros de compilação TypeScript.
- [ ] A auditoria de padrões (`pnpm standards:review`) passa com zero violações.
```

<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->
