# plan.52.md
# Plano de Implementação TDD — test(e2e): Configuração de Suíte Automatizada End-to-End com Playwright Headless (#52)

> **Gerado pelo:** Dinheirizz | Tech Lead (Arquiteto Chefe & Gatekeeper de Qualidade)  
> **Status:** Aprovado para Execução pelo Frontend Developer  
> **Referência:** `specs/spec.52.md` | Issue #52 (GitHub) / LEO-58 (Paperclip)  
> **Alvo:** Frontend SPA/PWA (`src/`), Configuração E2E (`playwright.config.ts`), Suíte de Testes E2E (`e2e/`)  

---

## 1. Resumo do Entendimento

A Issue #52 estabelece a fundação e padronização da **Suíte de Testes End-to-End (E2E) Automatizada com Playwright Headless** para o Dinheirizz 2.0, garantindo cobertura contínua dos fluxos mais vitais da aplicação:
1. **Infraestrutura de Automação Headless:**
   - Instalação e registro de `@playwright/test` como ferramenta de automação end-to-end.
   - Configuração de `playwright.config.ts` com orquestração do dev server Vite (`pnpm dev`, porta 3000, `baseURL: http://localhost:3000`).
   - Suporte nativo a execução headless multiplataforma (Windows e Linux/CI).
   - Matriz multi-dispositivo configurada: Desktop Chromium (1280x800) e Mobile Chromium / Pixel standard (390x844).
   - Scripts NPM padronizados em `package.json` (`test:e2e`, `test:e2e:ui`, `test:e2e:report`).
2. **Enriquecimento de Contratos e Seletores (`data-testid`):**
   - Inclusão de `data-testid` determinísticos em formulários e dashboards para eliminar dependência frágil de seletores de classe ou texto:
     - `src/components/auth/LoginScreen.tsx`: `auth-fullname-input`, `auth-username-input`, `auth-email-input`, `auth-password-input`, `auth-confirm-password-input`.
     - `src/components/modals/TransactionModal.tsx`: `transaction-amount-input`, `transaction-description-input`.
     - `src/components/dashboard/Dashboard.tsx`: `main-balance-value`.
3. **Cenários E2E Críticos Implementados em `e2e/`:**
   - `e2e/auth.spec.ts`: Fluxo completo de boas-vindas (`WelcomeScreen`), alternância de abas de autenticação (Login vs. Cadastro), entrada direta no Dashboard via Modo Demonstração (`welcome-demo-btn`), alternância de Dual-Theme (`Dark Luxury` vs. `Light Clean`) com validação no elemento `html`, e asserção estrita de ausência de overflow horizontal (`scrollWidth <= innerWidth`).
   - `e2e/transactions.spec.ts`: Abertura do modal via ação rápida (`quick-action-income`), preenchimento de valor e descrição, submissão, verificação de feedback via Toast e validação do incremento imediato do saldo no Dashboard (`main-balance-value`), seguido do registro de despesa (`quick-action-expense`) com dedução correspondente.
   - `e2e/budgets.spec.ts`: Abertura do modal de orçamento a partir do widget no Dashboard (`open-budget-modal-btn`), definição e salvamento de teto para categoria de despesa (`input-budget-cat-1` / `btn-save-budget-cat-1`), fechamento e validação da renderização do envelope de progresso no Dashboard (`budget-envelope-cat-1`).
4. **Respeito à Constituição Dinheirizz (`AGENTS.md` & `STANDARDS.md`):**
   - 100% de arrow functions em helpers e testes.
   - Strict TypeScript sem `any`.
   - Zero `!important` e conformidade visual com o design system OKLCH / Glassmorphism.
   - Preservação da suíte de 473 testes unitários/integração do Vitest (`pnpm test`).

---

## 2. Dúvidas e Ambiguidades

- **Impacto no Backend (`api/`, `drizzle/`):** Nenhum. As rotas do BFF e migrações já estão estáveis. A suíte E2E utiliza a aplicação React conectada via Vite dev server (`http://localhost:3000`), operando perfeitamente tanto no Modo Demonstração client-side (com WebCrypto) quanto em ambiente mockado.
- **Isolamento de Estado entre Testes:** Cada teste Playwright opera em uma nova página / contexto isolado de navegador (`browser.newContext()`), prevenindo contaminação de `localStorage` ou estado de sessão.
- **Execução em CI vs Local:** O parâmetro `reuseExistingServer: !process.env.CI` no `playwright.config.ts` garante que localmente o desenvolvedor possa reaproveitar um servidor já aberto, enquanto no CI o Vite é inicializado e finalizado de forma estritamente hermética.

---

## 3. Sequência de Implementação (TDD: Red → Green → Refactor)

> Os passos seguem a ordem rigorosa Red → Green → Refactor.
> Todo código deve utilizar Arrow Functions, tipagem estrita (zero `any`), atributos `data-testid` obrigatórios e conformidade visual com o Design System.

---

### Passo 1 — Instalação de Dependências e Scripts no `package.json`

**O que faz:**
- **🔴 Red:**
  - A execução de `pnpm test:e2e` falha imediatamente por ausência do script correspondente no `package.json` e falta do módulo `@playwright/test`.
- **🟢 Green:**
  - Adicionar `@playwright/test` às `devDependencies` do `package.json`.
  - Executar `pnpm add -D @playwright/test` e instalar os binários de browser necessários (`pnpm exec playwright install chromium`).
  - Registrar os scripts no `package.json`:
    - `"test:e2e": "playwright test"`
    - `"test:e2e:ui": "playwright test --ui"`
    - `"test:e2e:report": "playwright show-report"`
- **🔵 Refactor:**
  - Garantir integridade do arquivo `package.json` sem quebrar ordem alfabética de dependências ou formatação.

**Arquivos criados/alterados:**
- ALTERAR: `package.json`
**Teste:** Verificação de execução do CLI (`pnpm test:e2e --version`).

---

### Passo 2 — Configuração Central da Suíte (`playwright.config.ts`)

**O que faz:**
- **🔴 Red:**
  - Execução de `pnpm test:e2e` acusa erro de arquivo de configuração não encontrado (`playwright.config.ts`).
- **🟢 Green:**
  - Criar `playwright.config.ts` na raiz do projeto com as seguintes diretivas:
    - `testDir: './e2e'`
    - `fullyParallel: true`
    - `forbidOnly: !!process.env.CI`
    - `retries: process.env.CI ? 2 : 0`
    - `workers: process.env.CI ? 1 : undefined`
    - `reporter: [['html', { open: 'never' }], ['list']]`
    - `use`:
      - `baseURL: 'http://localhost:3000'`
      - `trace: 'on-first-retry'`
      - `screenshot: 'only-on-failure'`
      - `video: 'retain-on-failure'`
    - `projects`:
      - `chromium`: `devices['Desktop Chrome']` (1280x800)
      - `Mobile Chrome`: `{ ...devices['Pixel 5'], viewport: { width: 390, height: 844 } }`
    - `webServer`:
      - `command: 'pnpm dev'`
      - `url: 'http://localhost:3000'`
      - `reuseExistingServer: !process.env.CI`
      - `timeout: 120000`
- **🔵 Refactor:**
  - Assegurar que os caminhos e propriedades estejam 100% tipados via TypeScript.

**Arquivos criados/alterados:**
- CRIAR: `playwright.config.ts`
**Teste:** Execução de `pnpm test:e2e` reconhecendo o diretório `e2e/`.

---

### Passo 3 — Enriquecimento de `data-testid` nos Componentes Frontend

**O que faz:**
- **🔴 Red:**
  - Testes E2E que buscarem elementos por `getByTestId('auth-email-input')`, `getByTestId('transaction-amount-input')` ou `getByTestId('main-balance-value')` falham com timeout.
- **🟢 Green:**
  - Em `src/components/auth/LoginScreen.tsx`:
    - Adicionar `data-testid="auth-fullname-input"` no input de Nome Completo.
    - Adicionar `data-testid="auth-username-input"` no input de Username / Handle.
    - Adicionar `data-testid="auth-email-input"` no input de E-mail.
    - Adicionar `data-testid="auth-password-input"` no input de Senha.
    - Adicionar `data-testid="auth-confirm-password-input"` no input de Confirmação de Senha.
  - Em `src/components/modals/TransactionModal.tsx`:
    - Adicionar `data-testid="transaction-amount-input"` no input do valor monetário.
    - Adicionar `data-testid="transaction-description-input"` no input da descrição.
  - Em `src/components/dashboard/Dashboard.tsx`:
    - Adicionar `data-testid="main-balance-value"` no cabeçalho `<h2>` de exibição do saldo principal.
- **🔵 Refactor:**
  - Validar que a adição dos atributos não afeta o layout visual nem gera quebras nos 473 testes unitários existentes do Vitest (`pnpm test`).

**Arquivos criados/alterados:**
- ALTERAR: `src/components/auth/LoginScreen.tsx`
- ALTERAR: `src/components/modals/TransactionModal.tsx`
- ALTERAR: `src/components/dashboard/Dashboard.tsx`
**Teste:** `pnpm test` (garantir zero regressão).

---

### Passo 4 — Suíte E2E de Boas-vindas, Login, Demonstração e Dual-Theme (`e2e/auth.spec.ts`)

**O que faz:**
- **🔴 Red:**
  - Criar `e2e/auth.spec.ts` com asserções estritas cobrindo:
    1. *Navegação Welcome ➔ Login*: Acesso à raiz `/`, visualização da tela de boas-vindas, clique em `welcome-login-btn` e carregamento do formulário `LoginScreen`.
    2. *Alternância de Abas*: Troca entre as abas "Entrar" e "Criar conta", verificando a aparição dinâmica dos campos `auth-fullname-input`, `auth-username-input` e `auth-confirm-password-input`.
    3. *Modo Demonstração*: Acesso à raiz `/`, clique no botão `welcome-demo-btn` e redirecionamento instantâneo para o Dashboard com visualização do card de saldo principal (`main-balance-value`).
    4. *Alternância de Dual-Theme*:
       - Clique no toggle de tema da Landing (`landing-theme-toggle-btn`) e do Header do Dashboard (`header-theme-toggle-btn`).
       - Verificação de presença e remoção das classes `dark` e `light` no elemento raiz `<html>`.
    5. *Responsividade & Zero Overflow Horizontal*:
       - Em viewports Mobile (390px) e Desktop (1280px), checar programaticamente via `page.evaluate`:
         `document.documentElement.scrollWidth <= window.innerWidth`.
- **🟢 Green:**
  - Implementar o teste utilizando asserções idiomáticas do Playwright (`await expect(...)`) com seletores por `data-testid` e `role`.
- **🔵 Refactor:**
  - Usar arrow functions em todos os blocos `test('...', async ({ page }) => {})`.
  - Garantir ausência de esperas fixas (`page.waitForTimeout`) substituindo por esperas determinísticas baseadas em estado e locators (`toBeVisible()`).

**Arquivos criados/alterados:**
- CRIAR: `e2e/auth.spec.ts`
**Teste:** `pnpm test:e2e e2e/auth.spec.ts`.

---

### Passo 5 — Suíte E2E de Registro de Transações e Atualização de Saldo (`e2e/transactions.spec.ts`)

**O que faz:**
- **🔴 Red:**
  - Criar `e2e/transactions.spec.ts` cobrindo a jornada financeira central no Modo Demonstração:
    1. *Entrada no Dashboard*: Carregar `/` e clicar em `welcome-demo-btn`.
    2. *Captura do Saldo Inicial*: Ler o texto de `data-testid="main-balance-value"`.
    3. *Registro de Receita*:
       - Clicar na ação rápida de Receita (`quick-action-income`).
       - Aguardar modal visível (`role="dialog"` ou formulário de transação).
       - Preencher valor (`transaction-amount-input`) com `1500,00`.
       - Preencher descrição (`transaction-description-input`) com `Consultoria Freelance E2E`.
       - Clicar no botão de submissão do formulário.
       - Verificar exibição do feedback de sucesso (Sonner Toast).
       - Verificar que o saldo principal (`main-balance-value`) foi incrementado e a transação consta na listagem recente.
    4. *Registro de Despesa*:
       - Clicar na ação rápida de Despesa (`quick-action-expense`).
       - Preencher valor com `300,00` e descrição `Almoço de Negócios E2E`.
       - Submeter e verificar atualização do saldo refletindo o débito.
- **🟢 Green:**
  - Executar a suíte e verificar resolução estável e determinística das transações no estado local da aplicação.
- **🔵 Refactor:**
  - Isolar helpers de extração monetária em arrow function para evitar duplicação de parsing de strings em Real (`R$ 1.500,00`).

**Arquivos criados/alterados:**
- CRIAR: `e2e/transactions.spec.ts`
**Teste:** `pnpm test:e2e e2e/transactions.spec.ts`.

---

### Passo 6 — Suíte E2E de Criação e Monitoramento de Orçamentos (`e2e/budgets.spec.ts`)

**O que faz:**
- **🔴 Red:**
  - Criar `e2e/budgets.spec.ts` cobrindo o gerenciamento de envelopes de orçamento:
    1. *Acesso ao Widget*: No Dashboard (modo demo), localizar o widget de orçamentos e clicar no botão `open-budget-modal-btn`.
    2. *Ajuste de Teto Orçamentário*:
       - Aguardar abertura do modal `BudgetModal`.
       - Localizar o primeiro campo de categoria disponível (ex: `input-budget-cat-1` ou categoria de despesa visível).
       - Preencher o novo teto monetário (ex: `1200,00`).
       - Clicar no respectivo botão de salvar (`btn-save-budget-...`).
       - Fechar o modal via botão de fechar (`btn-close-budget-modal`).
    3. *Validação no Dashboard*:
       - Confirmar que o envelope correspondente (`budget-envelope-...`) está renderizado no widget com a barra de progresso e valores atualizados.
- **🟢 Green:**
  - Executar a suíte garantindo que a sincronização entre `BudgetModal` e `BudgetProgressWidget` ocorra sem atrasos ou race conditions.
- **🔵 Refactor:**
  - Assegurar tratamento resiliente para casos onde a categoria possui ID dinâmico, utilizando locators flexíveis combinados com `data-testid`.

**Arquivos criados/alterados:**
- CRIAR: `e2e/budgets.spec.ts`
**Teste:** `pnpm test:e2e e2e/budgets.spec.ts`.

---

### Passo 7 — Validação Integrada, Build de Produção e Auditoria Standards

**O que faz:**
- Executar a suíte completa de testes E2E headless via `pnpm test:e2e` em Chromium Desktop e Mobile Chrome.
- Executar a suíte de testes unitários existente via `pnpm test` (garantindo 473+ testes passando).
- Executar o build estrito via `pnpm build` (`tsc -b && vite build`) garantindo zero erros de tipagem TypeScript.
- Executar a auditoria mecânica via `pnpm standards:review` assegurando zero violações de padrões de código.

**Arquivos criados/alterados:** Nenhum.
**Teste:** `pnpm test:e2e`, `pnpm test`, `pnpm build` e `pnpm standards:review`.

---

## 4. Arquivos Criados, Alterados e Removidos

### Arquivos Criados
```
playwright.config.ts                      # Configuração oficial do Playwright com webServer e multi-dispositivo
e2e/auth.spec.ts                          # Testes E2E de Welcome, Login, Demo, Dual-Theme e Responsividade
e2e/transactions.spec.ts                  # Testes E2E de registro de receita/despesa e atualização de saldo
e2e/budgets.spec.ts                       # Testes E2E de envelopes orçamentários e monitoramento no Dashboard
specs/plan.52.md                          # Este plano de implementação técnica TDD
```

### Arquivos Alterados
```
package.json                              # Inclusão de @playwright/test em devDependencies e scripts test:e2e*
src/components/auth/LoginScreen.tsx       # Atributos data-testid nos inputs de formulário
src/components/modals/TransactionModal.tsx # Atributos data-testid nos inputs de valor e descrição
src/components/dashboard/Dashboard.tsx     # Atributo data-testid="main-balance-value" no saldo principal
```

### Arquivos Removidos
```
Nenhum
```

---

## 5. Superfície de Regressão

| Arquivo / Fluxo | O que testa | Risco de Quebra | Mitigação |
| :--- | :--- | :--- | :--- |
| `src/tests/Auth.spec.tsx` | Formulário e validação de autenticação | Baixo | Adição não-destrutiva de `data-testid` mantendo todos os `aria-label` e classes intactos. |
| `src/tests/TransactionModal.spec.tsx` | Validação e submissão do modal de transação | Baixo | Adição estrita de atributos HTML (`data-testid`), sem alteração na lógica de estado ou validação. |
| `src/tests/Dashboard.spec.tsx` | Exibição de cards, saldos e ações do Dashboard | Baixo | Adição pontual de `data-testid="main-balance-value"` no elemento `<h2>` do saldo principal. |
| `src/tests/BudgetModal.spec.tsx` | Configuração de tetos orçamentários | Nulo | Nenhuma alteração estrutural no componente, apenas testes E2E externos. |
| Suíte Vitest (`pnpm test`) | 79 arquivos e 473 testes unitários/integração | Nulo | Execução automatizada e contínua do Vitest a cada etapa para garantir 100% de passagem. |
| Build Vite / PWA (`pnpm build`) | Compilação TypeScript e empacotamento SPA/PWA | Nulo | Validação rigorosa de tipagem estrita com `tsc -b`. |

---

## 6. Matriz de Rastreabilidade (Critérios de Aceite × Passos)

| Critério de Aceite (Spec #52, Seção 8) | Atendido no Passo |
| :--- | :--- |
| `@playwright/test` registrado em `devDependencies` | Passo 1 |
| Script `"test:e2e": "playwright test"` no `package.json` | Passo 1 |
| `playwright.config.ts` com `baseURL: http://localhost:3000`, `webServer` e projetos Desktop + Mobile | Passo 2 |
| `LoginScreen.tsx` com `data-testid` nos 5 campos de entrada | Passo 3 |
| `TransactionModal.tsx` com `data-testid` nos inputs de valor e descrição | Passo 3 |
| `Dashboard.tsx` com `data-testid="main-balance-value"` | Passo 3 |
| `e2e/auth.spec.ts` cobrindo Welcome, Login, Demo, Dual-Theme e ausência de overflow horizontal | Passo 4 |
| `e2e/transactions.spec.ts` cobrindo receitas, despesas, toast e atualização do saldo | Passo 5 |
| `e2e/budgets.spec.ts` cobrindo abertura de modal, definição de limite e envelope renderizado | Passo 6 |
| 100% dos testes Vitest (`pnpm test`) passando | Passo 7 |
| Build de produção (`pnpm build`) sem erros de compilação | Passo 7 |
| Auditoria de padrões (`pnpm standards:review`) aprovada com 0 divergências | Passo 7 |

---

## 7. O Que Está Fora Deste Plano

- Testes E2E contra provedores OAuth reais em produção (Google Cloud / Apple Developer).
- Leitura OCR por câmera física no Playwright (mock de upload já coberto em testes unitários).
- Reescrita ou substituição dos testes unitários do Vitest.
- Alterações em schemas de banco de dados (`drizzle/`) ou endpoints do backend BFF (`api/`).

---

## 8. Decisão de Arquitetura & Roteamento do Tech Lead

- **Status da Spec:** `specs/spec.52.md` auditada e aprovada com louvor.
- **Status do Plano:** `specs/plan.52.md` estruturado em 7 etapas TDD com clara divisão de escopo.
- **Roteamento:** A demanda não envolve alteração de banco de dados ou endpoints de backend BFF (`api/`). Trata-se de configuração de infraestrutura de testes e ajustes na camada SPA (`src/`). Portanto, o despacho é direcionado imediatamente ao **Frontend Developer** (`pnpm task:handoff --assign frontend`).
