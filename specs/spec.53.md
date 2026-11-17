# spec.53.md
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
Issue principal:    #53 (GitHub) / LEO-59 (Paperclip)
Título:             feat(finance): Conciliação Inteligente de Faturas de Cartão de Crédito com Ciclos e Parcelamento
Tipo:               feat
Branch:             feat/53-credit-cards-invoices
Milestone:          Dinheirizz 2.0 - Gestão Avançada de Cartões e Ciclos Financeiros
Status:             Pronto para Auditoria do Tech Lead (Fase 1 SDD Concluída)
Data de Criação:    2026-11-13T18:52:00Z
Data da Spec:       2026-11-16T22:30:00Z
Autor:              Dinheirizz | PM (Product Manager & Arquiteto SDD)
```

**Issues relacionadas**
```
#1   🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#31  [Fase 3.2] Metas e Envelopes de Gastos: Criação de Orçamentos por Categoria com Barras de Progresso
#33  feat(ai): Leitura e Registro Automático de Comprovantes via IA Multimodal
#50  feat(ui): Implementação do Tema Claro Oficial (Light Clean) e Persistência de Dual-Theme
#52  test(e2e): Configuração de Suíte Automatizada End-to-End com Playwright Headless
```

---

## 2. Contexto

A gestão de cartões de crédito é um dos pilares mais sensíveis e críticos na saúde financeira de qualquer usuário. No modelo atual do Dinheirizz, transações parceladas criam múltiplos registros no extrato geral com datas mensais incrementadas, porém não existe a entidade de **Cartão de Crédito** nem a modelagem real de **Ciclos de Fatura** (Dia de Fechamento, Dia de Vencimento, Status de Fatura Aberta, Fechada e Paga).

Isso acarreta três deficiências centrais no controle orçamentário:
1. **Descompasso Temporal de Caixa vs. Competência:** Uma compra realizada com cartão não consome o saldo imediato da conta corrente bancária; ela consome o **limite de crédito** e deve ser quitada na data de vencimento da fatura.
2. **Ausência da Regra do "Melhor Dia de Compra":** No mercado financeiro brasileiro, despesas realizadas **antes** do dia de fechamento do ciclo entram na fatura do mês corrente; despesas realizadas **a partir do dia de fechamento** são alocadas na fatura do mês subsequente (ganhando até 40 dias de prazo). Em parcelamentos (ex: 10x), as parcelas devem ser projetadas cronologicamente ao longo das faturas mensais correspondentes.
3. **Falta de Conciliação e Antecipação de Parcelas:** Usuários modernos (habituados a fintechs como Nubank, Itaú e Inter) necessitam visualizar a barra de progresso do limite de crédito consumido/disponível, realizar o pagamento consolidado da fatura com débito direto em uma conta corrente e ter o poder de antecipar parcelas futuras para a fatura aberta do mês.

Esta especificação define a arquitetura completa de dados no Drizzle ORM (`credit_cards` e `invoices`), a integração relacional com `transactions`, os endpoints REST do BFF HonoJS para fechamento e conciliação de faturas, e a interface visual moderna (Dual-Theme, Anti-Slop, 100% responsiva e com `data-testid`).

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
AGENTS.md                # Regras de ouro: Arrow functions, sem any, data-testid obrigatório, sem !important
STANDARDS.md             # Padrões mecânicos auditados por pnpm standards:review
specs/design-system.md   # Tokens de cores OKLCH, Glassmorphism, temas Dark Luxury e Light Clean
specs/testing.md         # Pirâmide de testes no Vitest e isolamento de mocks do Drizzle ORM
```

### 3.2 Arquivos-chave a inspecionar
```
api/src/db/schema.ts                       # Schemas das tabelas Drizzle ORM (accounts, users, transactions)
api/src/routes/transactions.ts             # Lógica de criação de transações e parcelamento existente
api/src/routes/accounts.ts                 # Manipulação de contas bancárias e saldos
src/components/dashboard/Dashboard.tsx     # Dashboard principal e exibição atual de cartões/resumos
src/components/modals/TransactionModal.tsx # Modal de criação de transação (inclusão de cartão de crédito e parcelas)
src/hooks/useAccounts.ts                   # Hook de contas bancárias e saldo
src/hooks/useTransactions.ts               # Hook de transações e extrato
```

---

## 4. Escopo da Funcionalidade

### Está incluso (In Scope)

#### 4.1 Modelagem de Dados Relacional (Drizzle ORM & Supabase PostgreSQL)
1. **Tabela `credit_cards` (`api/src/db/schema.ts`):**
   - `id`: `uuid` chave primária (`defaultRandom()`).
   - `userId`: `uuid` referenciando `users.id` com `onDelete: 'cascade'`.
   - `accountId`: `uuid` referenciando `accounts.id` com `onDelete: 'cascade'` (conta corrente padrão para liquidação de faturas).
   - `name`: `text` obrigatório (ex: "Nubank Ultravioleta", "Itaú Personnalité Black").
   - `brand`: `text` com default `'mastercard'` ('mastercard' | 'visa' | 'elo' | 'amex' | 'hipercard' | 'other').
   - `limitAmount`: `numeric({ precision: 12, scale: 2 })` obrigatório (limite total contratado).
   - `closingDay`: `integer` obrigatório (dia do mês em que a fatura fecha, 1 a 31).
   - `dueDay`: `integer` obrigatório (dia do mês de vencimento da fatura, 1 a 31).
   - `color`: `text` opcional com default `'#7bc816'` (cor de destaque do cartão).
   - `lastFourDigits`: `text` opcional (4 dígitos finais para identificação visual, ex: '4242').
   - `archived`: `boolean` com default `false`.
   - `createdAt` e `updatedAt`: `timestamp with time zone`.
   - Índices: `credit_cards_user_id_idx` e `credit_cards_account_id_idx`.

2. **Tabela `invoices` (`api/src/db/schema.ts`):**
   - `id`: `uuid` chave primária (`defaultRandom()`).
   - `creditCardId`: `uuid` referenciando `credit_cards.id` com `onDelete: 'cascade'`.
   - `userId`: `uuid` referenciando `users.id` com `onDelete: 'cascade'`.
   - `period`: `text` obrigatório no formato `'YYYY-MM'` (mês de vencimento de referência da fatura).
   - `closingDate`: `timestamp with time zone` obrigatório.
   - `dueDate`: `timestamp with time zone` obrigatório.
   - `amount`: `numeric({ precision: 12, scale: 2 })` com default `'0.00'`.
   - `status`: `text` com default `'open'` ('open' | 'closed' | 'paid' | 'overdue').
   - `paidAmount`: `numeric({ precision: 12, scale: 2 })` com default `'0.00'`.
   - `paidAt`: `timestamp with time zone` opcional.
   - `paymentAccountId`: `uuid` referenciando `accounts.id` com `onDelete: 'set null'`.
   - `paymentTransactionId`: `uuid` referenciando `transactions.id` com `onDelete: 'set null'`.
   - `createdAt` e `updatedAt`: `timestamp with time zone`.
   - Índices: `invoices_card_id_idx`, `invoices_user_period_idx` e constraint de unicidade `(creditCardId, period)`.

3. **Extensão da Tabela `transactions` (`api/src/db/schema.ts`):**
   - `creditCardId`: `uuid` referenciando `credit_cards.id` com `onDelete: 'set null'`.
   - `invoiceId`: `uuid` referenciando `invoices.id` com `onDelete: 'set null'`.
   - Índices: `transactions_credit_card_id_idx` e `transactions_invoice_id_idx`.

#### 4.2 Regras de Negócio e Cálculos Financeiros
1. **Ciclo de Fechamento e Alocação Inteligente de Compras:**
   - Ao lançar uma compra com cartão de crédito na data `occurredAt`:
     - Se o dia do mês de `occurredAt` for **menor** que o `closingDay` do cartão, a compra pertence à fatura que fecha no mês corrente de `occurredAt`.
     - Se o dia do mês de `occurredAt` for **maior ou igual** ao `closingDay` ("melhor dia de compra"), a compra é alocada na fatura do ciclo subsequente (`mês + 1`).
   - Faturas são criadas ou recuperadas dinamicamente sob demanda com cálculo exato de `closingDate` e `dueDate`.
2. **Parcelamento de Compras com Cartão (ex: N parcelas):**
   - A parcela `1` cai na fatura do ciclo inicial calculado pela regra acima.
   - Cada parcela subsequente `i` (de `2` até `N`) é alocada na fatura do período `ciclo inicial + (i - 1) meses`.
   - O valor de cada parcela é recalculado com arredondamento preciso em duas casas decimais, mantendo a soma das parcelas idêntica ao total.
3. **Cálculo de Limite Consumido e Disponível:**
   - `usedLimit` = Soma de todas as parcelas e compras pendentes de quitação (faturas com status `open` e `closed`).
   - `availableLimit` = `Math.max(0, limitAmount - usedLimit)`.
   - Porcentagem consumida = `(usedLimit / limitAmount) * 100`.
4. **Liquidação e Conciliação da Fatura:**
   - Ao pagar a fatura (`POST /api/v1/invoices/:id/pay`):
     - Validação se a fatura já não foi liquidada.
     - Registro de uma transação de débito/despesa (`type: 'expense'`) na conta bancária selecionada (`paymentAccountId`), com descrição `Pagamento de Fatura - {Nome do Cartão} ({period})`.
     - Abatimento do saldo na conta corrente bancária correspondente.
     - Atualização do status da fatura para `paid`, registrando `paidAmount`, `paidAt` e `paymentTransactionId`.
     - Liberação imediata do limite de crédito correspondente.
5. **Antecipação de Parcelas:**
   - Endpoint `POST /api/v1/credit-cards/:id/anticipate-installments`:
     - O usuário pode selecionar transações de parcelas futuras (pertencentes a faturas ainda não abertas ou futuras).
     - As parcelas selecionadas são reatribuídas à fatura `open` corrente do cartão.
     - Os valores das faturas envolvidas são recalculados e sincronizados atomicamente.

#### 4.3 Endpoints REST no BFF HonoJS (`api/src/routes/creditCards.ts` e `api/src/routes/invoices.ts`)
- `GET /api/v1/credit-cards`: Lista todos os cartões do usuário autenticado com limites calculados (`limitAmount`, `usedLimit`, `availableLimit`) e dados da fatura corrente.
- `POST /api/v1/credit-cards`: Cria novo cartão de crédito validado por schema Zod estrito.
- `GET /api/v1/credit-cards/:id`: Retorna dados do cartão com resumo da fatura aberta e faturas recentes.
- `PUT /api/v1/credit-cards/:id`: Atualiza limites, nome, cor e dias de ciclo.
- `DELETE /api/v1/credit-cards/:id`: Exclui ou arquiva cartão de crédito.
- `GET /api/v1/credit-cards/:id/invoices`: Lista histórico de faturas do cartão (com filtros de ano e status).
- `GET /api/v1/invoices/:id`: Retorna detalhes completos da fatura com a lista de transações/parcelas vinculadas.
- `POST /api/v1/invoices/:id/close`: Fecha antecipadamente ou consolida o ciclo da fatura (`status: 'closed'`).
- `POST /api/v1/invoices/:id/pay`: Efetua a liquidação da fatura vinculada à conta bancária de débito.
- `POST /api/v1/credit-cards/:id/anticipate-installments`: Executa a antecipação de parcelas futuras para a fatura aberta atual.

#### 4.4 Camada Frontend & Design System Anti-Slop
1. **Custom Hooks e Estado Reativo (TanStack React Query v5):**
   - `src/hooks/useCreditCards.ts`: Query `['credit-cards']`, mutations para criar, editar, excluir, antecipar parcelas e pagar faturas.
2. **Componente de Cartão Virtual Moderno (`CreditCardWidget` / `CreditCardItem`):**
   - Relação de aspecto de cartão de crédito (1.586:1) com cantos arredondados (`rounded-2xl`).
   - Efeito Glassmorphism com borda sutil, gradiente suave derivado da cor do cartão e chip metálico SVG minimalista.
   - Exibição de: Bandeira (Mastercard, Visa, etc.), 4 dígitos finais (`•••• 8821`), Dia de Fechamento e Vencimento.
   - Barra de progresso de limite consumido com gradiente semântico:
     - < 60%: Verde/Lima suave (`oklch(0.75 0.18 135)`)
     - 60% a 85%: Âmbar/Aviso (`oklch(0.78 0.16 75)`)
     - > 85%: Vermelho/Alerta (`oklch(0.65 0.22 25)`)
   - Badge de status da fatura: `Aberta` (Azul/Ciano), `Fechada` (Âmbar), `Paga` (Neon Lime), `Atrasada` (Vermelho).
3. **Modais de Interação e Gestão:**
   - `CreditCardModal.tsx`: Cadastro e edição de cartão de crédito.
   - `InvoiceDetailsModal.tsx`: Visualização discriminada de compras e parcelas da fatura.
   - `InvoicePaymentModal.tsx`: Liquidação com seleção de conta corrente de débito e exibição do saldo em tempo real.
   - `AnticipateInstallmentsModal.tsx`: Seleção de parcelas futuras para antecipação com recálculo instantâneo do valor da fatura.
4. **Integração no `TransactionModal.tsx`:**
   - Suporte à seleção do meio de pagamento "Cartão de Crédito".
   - Ao selecionar um cartão, habilita o seletor de parcelas (1x até 24x) com indicação automática: *"Primeira parcela cairá na fatura de {Mês} (vencimento em {Data})"*.
5. **Dual-Theme e Acessibilidade:**
   - Cores totalmente acopladas às variáveis semânticas de `src/index.css` (`--card`, `--background`, `--primary`, `--muted-foreground`).
   - Compatibilidade total com `Dark Luxury` e `Light Clean`.
   - Área mínima de toque de 44x44px em botões e controles.
   - `data-testid` determinísticos em todos os elementos.

---

### Está fora do escopo (Out of Scope)
```
- Integração via Open Finance bancário direto com APIs de bancos reais (Pluggy / Belvo) nesta fase.
- Importação direta de arquivo OFX ou PDF de fatura (já coberto na issue #33 / #48).
- Cobrança de juros de crédito rotativo ou refinanciamento automático de fatura em atraso.
- Emissão de cartão físico ou integração com gateway de processamento adquirente (Stripe/Pagar.me).
```

---

## 5. Contratos e Schemas

### 5.1 Schemas Zod de Validação (`api/src/schemas/creditCards.ts` e `src/schemas/creditCards.ts`)

```typescript
import { z } from 'zod'

export const creditCardBrandEnum = z.enum([
  'mastercard',
  'visa',
  'elo',
  'amex',
  'hipercard',
  'other'
])

export const createCreditCardSchema = z.object({
  name: z.string({ required_error: 'Nome do cartão é obrigatório' }).min(2, 'Nome deve ter no mínimo 2 caracteres').max(60),
  accountId: z.string({ required_error: 'Conta padrão para liquidação é obrigatória' }).uuid('ID de conta inválido'),
  brand: creditCardBrandEnum.default('mastercard'),
  limitAmount: z.number({ required_error: 'Limite de crédito é obrigatório' }).positive('Limite deve ser maior que zero'),
  closingDay: z.number({ required_error: 'Dia de fechamento é obrigatório' }).int().min(1).max(31),
  dueDay: z.number({ required_error: 'Dia de vencimento é obrigatório' }).int().min(1).max(31),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Cor hexadecimal inválida').optional().default('#7bc816'),
  lastFourDigits: z.string().regex(/^\d{4}$/, 'Informe exatamente 4 dígitos numéricos').optional().nullable()
})

export const updateCreditCardSchema = createCreditCardSchema.partial()

export const payInvoiceSchema = z.object({
  paymentAccountId: z.string({ required_error: 'Conta bancária de débito é obrigatória' }).uuid('ID de conta inválido'),
  amount: z.number({ required_error: 'Valor do pagamento é obrigatório' }).positive('Valor deve ser positivo'),
  paidAt: z.string().optional() // Data ISO da liquidação (default: data atual)
})

export const anticipateInstallmentsSchema = z.object({
  transactionIds: z.array(z.string().uuid('ID de transação inválido')).min(1, 'Selecione ao menos uma parcela para antecipar')
})
```

---

### 5.2 Endpoints REST do BFF HonoJS

#### `GET /api/v1/credit-cards`
- **Headers:** `Authorization: Bearer <jwt>`
- **Response 200 OK:**
```json
{
  "data": [
    {
      "id": "e0b8214f-56bb-49e3-863a-bbcecbcf9121",
      "name": "Nubank Ultravioleta",
      "brand": "mastercard",
      "limitAmount": 15000.00,
      "usedLimit": 3450.80,
      "availableLimit": 11549.20,
      "closingDay": 25,
      "dueDay": 5,
      "color": "#7bc816",
      "lastFourDigits": "8821",
      "accountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "currentInvoice": {
        "id": "f1a2b3c4-d5e6-7890-1234-56789abcdef0",
        "period": "2026-11",
        "amount": 1250.40,
        "status": "open",
        "closingDate": "2026-11-25T00:00:00.000Z",
        "dueDate": "2026-12-05T00:00:00.000Z"
      }
    }
  ],
  "total": 1
}
```

#### `POST /api/v1/credit-cards`
- **Headers:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Itaú Personnalité Black",
  "accountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "brand": "mastercard",
  "limitAmount": 30000.00,
  "closingDay": 18,
  "dueDay": 28,
  "color": "#eab308",
  "lastFourDigits": "1049"
}
```
- **Response 201 Created:** Retorna o registro criado com status `201`.

#### `GET /api/v1/invoices/:id`
- **Headers:** `Authorization: Bearer <jwt>`
- **Response 200 OK:**
```json
{
  "invoice": {
    "id": "f1a2b3c4-d5e6-7890-1234-56789abcdef0",
    "creditCardId": "e0b8214f-56bb-49e3-863a-bbcecbcf9121",
    "period": "2026-11",
    "amount": 1250.40,
    "status": "open",
    "closingDate": "2026-11-25T00:00:00.000Z",
    "dueDate": "2026-12-05T00:00:00.000Z",
    "paidAmount": 0.00,
    "paidAt": null,
    "items": [
      {
        "id": "tx-1234",
        "description": "Notebook Dell (3/10)",
        "amount": 450.00,
        "occurredAt": "2026-10-15T14:30:00.000Z",
        "installmentCurrent": 3,
        "installmentTotal": 10,
        "category": { "name": "Tecnologia", "color": "#38bdf8" }
      },
      {
        "id": "tx-5678",
        "description": "Supermercado Pão de Açúcar",
        "amount": 800.40,
        "occurredAt": "2026-11-02T19:00:00.000Z",
        "installmentCurrent": 1,
        "installmentTotal": 1,
        "category": { "name": "Alimentação", "color": "#10b981" }
      }
    ]
  }
}
```

#### `POST /api/v1/invoices/:id/pay`
- **Headers:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "paymentAccountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 1250.40,
  "paidAt": "2026-11-20T10:00:00.000Z"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "invoiceId": "f1a2b3c4-d5e6-7890-1234-56789abcdef0",
  "status": "paid",
  "paidAmount": 1250.40,
  "paymentTransactionId": "tx-payment-9999",
  "message": "Fatura liquidada com sucesso e débito registrado na conta bancária"
}
```

#### `POST /api/v1/credit-cards/:id/anticipate-installments`
- **Headers:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "transactionIds": ["tx-installment-4", "tx-installment-5"]
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "anticipatedCount": 2,
  "targetInvoiceId": "f1a2b3c4-d5e6-7890-1234-56789abcdef0",
  "newInvoiceAmount": 2150.40,
  "message": "Parcelas antecipadas com sucesso para a fatura aberta atual"
}
```

---

## 6. Arquitetura Visual, Dual-Theme e data-testid

### 6.1 Identificadores `data-testid` Mandatórios

```html
<!-- Seção e Listagem de Cartões -->
<div data-testid="credit-cards-container">
  <button data-testid="open-create-credit-card-btn">Novo Cartão</button>
  <div data-testid="credit-card-item-${id}">
    <span data-testid="credit-card-name">${name}</span>
    <span data-testid="credit-card-brand">${brand}</span>
    <span data-testid="credit-card-digits">•••• ${lastFourDigits}</span>
    <div data-testid="credit-card-limit-progress" role="progressbar" />
    <span data-testid="credit-card-available-limit">${availableLimit}</span>
    <span data-testid="credit-card-invoice-badge">${status}</span>
    <button data-testid="open-invoice-details-btn-${id}">Ver Fatura</button>
    <button data-testid="open-pay-invoice-btn-${id}">Pagar Fatura</button>
    <button data-testid="open-anticipate-btn-${id}">Antecipar Parcelas</button>
  </div>
</div>

<!-- Modal de Cadastro / Edição de Cartão -->
<div data-testid="credit-card-modal">
  <input data-testid="credit-card-name-input" />
  <select data-testid="credit-card-brand-select" />
  <input data-testid="credit-card-limit-input" />
  <input data-testid="credit-card-closing-day-input" />
  <input data-testid="credit-card-due-day-input" />
  <select data-testid="credit-card-account-select" />
  <input data-testid="credit-card-digits-input" />
  <button data-testid="btn-save-credit-card">Salvar Cartão</button>
</div>

<!-- Modal de Liquidação / Pagamento de Fatura -->
<div data-testid="invoice-payment-modal">
  <span data-testid="invoice-payment-amount">${amount}</span>
  <select data-testid="invoice-payment-account-select" />
  <button data-testid="btn-confirm-invoice-payment">Confirmar Pagamento</button>
</div>

<!-- Modal de Antecipação de Parcelas -->
<div data-testid="anticipate-installments-modal">
  <div data-testid="anticipate-item-${txId}">
    <input type="checkbox" data-testid="anticipate-checkbox-${txId}" />
  </div>
  <button data-testid="btn-confirm-anticipation">Confirmar Antecipação</button>
</div>
```

### 6.2 Critérios de Estética Anti-Slop & Dual-Theme
- Proibido o uso de tons roxos descontextualizados ou animações pulsantes genéricas de IA.
- Uso exclusivo de tokens semânticos (`src/index.css`):
  - No **Dark Luxury**: Fundo do card em vidro fosco com acento Neon Lime (`#7bc816`), tipografia nítida e números tabulares (`font-mono` / tabular-nums).
  - No **Light Clean**: Fundo do card em vidro claro translúcido (`oklch(1 0 0 / 0.8)`), bordas suaves (`oklch(0.88 0.01 260)`) e contraste superior a 8:1 com o fundo da página.
- Áreas interativas com altura mínima de 44px (Apple HIG).
- Zero overflow horizontal (`scrollWidth <= innerWidth`) nas resoluções `375px`, `390px`, `768px` e `1280px+`.

---

## 7. Arquivos que Serão Criados ou Alterados

```
CRIAR:
  api/src/schemas/creditCards.ts                # Schemas de validação Zod para cartões e faturas
  api/src/routes/creditCards.ts                # Router Hono de cartões de crédito e antecipação
  api/src/routes/invoices.ts                   # Router Hono de gestão e liquidação de faturas
  api/tests/credit-cards.spec.ts               # Testes de integração BFF das rotas de cartões
  api/tests/invoices.spec.ts                   # Testes de integração BFF de fechamento e liquidação
  src/schemas/creditCards.ts                   # Schemas de validação frontend compartilhados
  src/hooks/useCreditCards.ts                  # React Query hook para cartões e faturas
  src/components/cards/CreditCardWidget.tsx    # Visualização de cartões com barra de progresso
  src/components/modals/CreditCardModal.tsx    # Modal de cadastro e edição de cartão
  src/components/modals/InvoiceDetailsModal.tsx # Detalhamento de faturas e compras
  src/components/modals/InvoicePaymentModal.tsx # Modal de liquidação com débito em conta
  src/components/modals/AnticipateInstallmentsModal.tsx # Modal de antecipação de parcelas
  src/tests/CreditCards.spec.tsx               # Testes unitários do componente de cartões
  src/tests/InvoicePayment.spec.tsx            # Testes unitários do fluxo de liquidação de fatura

ALTERAR:
  api/src/db/schema.ts                         # Novas tabelas credit_cards, invoices e campos em transactions
  api/index.ts                                 # Registro dos routers /v1/credit-cards e /v1/invoices
  src/components/dashboard/Dashboard.tsx       # Inclusão do widget avançado de cartões de crédito
  src/components/modals/TransactionModal.tsx   # Suporte a cartão de crédito e preview da fatura
  src/types/database.types.ts                  # Tipagens TypeScript de cartões e faturas
  specs/spec.53.md                             # Esta especificação técnica SDD
```

---

## 8. Estratégia de Testes (TDD)

### 🔴 Red — testes que devem falhar primeiro

1. `api/tests/credit-cards.spec.ts`:
   - `POST /api/v1/credit-cards` deve falhar quando o dia de fechamento for inválido (< 1 ou > 31).
   - `POST /api/v1/credit-cards` deve criar com sucesso o cartão e inicializar a fatura aberta do mês.
   - `GET /api/v1/credit-cards` deve calcular corretamente `limitAmount`, `usedLimit` e `availableLimit`.
   - `POST /api/v1/credit-cards/:id/anticipate-installments` deve mover parcelas futuras para a fatura aberta atual e recalcular totais.

2. `api/tests/invoices.spec.ts`:
   - `POST /api/v1/invoices/:id/pay` deve rejeitar pagamento sem saldo ou com conta bancária inexistente.
   - `POST /api/v1/invoices/:id/pay` deve marcar a fatura como `paid`, criar uma transação de débito bancário vinculada e atualizar o saldo da conta.
   - A criação de uma transação com cartão no dia anterior ao fechamento deve alocar na fatura do ciclo atual; no dia do fechamento ou posterior, deve alocar na fatura do próximo mês.

3. `src/tests/CreditCards.spec.tsx`:
   - Deve renderizar o cartão de crédito virtual com nome, bandeira, limite e barra de progresso.
   - Deve exibir a cor da barra de limite em verde quando o consumo for < 60% e em vermelho quando > 85%.

4. `src/tests/InvoicePayment.spec.tsx`:
   - Deve abrir o modal de liquidação de fatura com o valor total pré-preenchido.
   - Deve selecionar a conta bancária de débito e disparar a mutação com feedback via toast.

### 🟢 Green — mínimo para os testes passarem

1. Criar as tabelas `credit_cards` e `invoices` em `api/src/db/schema.ts` com constraints e índices adequados.
2. Implementar `api/src/routes/creditCards.ts` e `api/src/routes/invoices.ts` com validações Zod e fallback resiliente em memória para testes unitários.
3. Plugar os novos routers no entrypoint `api/index.ts`.
4. Desenvolver `src/hooks/useCreditCards.ts` integrando com TanStack Query.
5. Construir os componentes visuais com Radix UI, Tailwind v4 e Glassmorphism conforme `specs/design-system.md`.

### 🔵 Refactor — melhorias após o green

1. Otimizar as queries SQL de faturas agregadas utilizando CTEs ou `json_agg` do PostgreSQL para reduzir viagens de rede ao banco.
2. Garantir transições suaves com `framer-motion` na alternância de faturas no modal de detalhes.
3. Assegurar conformidade total com o linter mecânico do projeto (`pnpm standards:review`).

---

## 9. Critérios de Aceite

```
- [ ] Schema Drizzle ORM atualizado em `api/src/db/schema.ts` com as tabelas `credit_cards` e `invoices`, além de referências em `transactions`.
- [ ] Endpoint `GET /api/v1/credit-cards` implementado retornando limite total, consumido e disponível calculados com precisão.
- [ ] Endpoint `POST /api/v1/credit-cards` implementado com validação estrita Zod (dias 1 a 31, limite positivo).
- [ ] Ciclo de fechamento respeitado: transações na data ou após o dia de fechamento caem na fatura do ciclo seguinte ("melhor dia de compra").
- [ ] Parcelamento com cartão de crédito aloca as parcelas subsequentes cronologicamente nas faturas futuras.
- [ ] Endpoint `POST /api/v1/invoices/:id/pay` executa a liquidação da fatura, gera a transação de despesa na conta bancária selecionada, atualiza o saldo bancário e libera o limite do cartão.
- [ ] Endpoint `POST /api/v1/credit-cards/:id/anticipate-installments` permite antecipar parcelas futuras para a fatura aberta do ciclo atual.
- [ ] Interface visual desenvolvida com suporte nativo a Dual-Theme (Dark Luxury + Light Clean) e zero AI-Slop.
- [ ] Barra de progresso de limite consumido com cores semânticas (verde <60%, âmbar 60-85%, vermelho >85%).
- [ ] 100% dos botões, inputs, seletores e modais contêm atributos `data-testid` determinísticos.
- [ ] Acessibilidade atendida com alvos de toque mínimos de 44x44px e ausência de overflow horizontal em viewports 375px/390px/768px/1280px+.
- [ ] 100% dos testes de integração do BFF (`api/tests/credit-cards.spec.ts` e `api/tests/invoices.spec.ts`) e unitários do frontend passando no Vitest.
- [ ] Execução limpa de `pnpm standards:review` e `pnpm build` sem erros ou avisos de tipagem estrita.
```

<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->
