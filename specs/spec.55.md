# spec.55.md
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
│   ├── lib/        # Utilitários, WebCrypto, parsers e clientes PWA
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
Issue principal:    #55 (GitHub) / LEO-61 (Paperclip)
Título:             feat(pwa): Notificações Pró-Ativas via Web Push API para Contas a Vencer e Limites de Orçamento
Tipo:               feat
Branch:             feat/55-pwa-push-notifications
Milestone:          Dinheirizz 2.0 - Notificações PWA, Automação Proativa e Engajamento
Status:             Pronto para Auditoria do Tech Lead (Fase 1 SDD Concluída)
Data de Criação:    2026-11-13T18:52:16Z
Data da Spec:       2026-11-17T05:35:00Z
Autor:              Dinheirizz | PM (Product Manager & Arquiteto SDD)
```

**Issues relacionadas**
```
#1   🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap (Épico pai)
#31  feat(budgets): Orçamentos por Categoria (Envelopes Financeiros)
#33  feat(calendar): Calendário Financeiro Interativo com Vencimentos e Pagamentos
#50  feat(ui): Implementação do Tema Claro Oficial (Light Clean) e Persistência de Dual-Theme
#52  test(e2e): Configuração de Suíte Automatizada End-to-End com Playwright Headless
#53  feat(finance): Conciliação Inteligente de Faturas de Cartão de Crédito com Ciclos e Parcelamento
#54  feat(export): Geração e Exportação de Relatórios Financeiros Executivos e Contábeis (PDF / CSV)
```

---

## 2. Contexto

A saúde financeira de qualquer usuário — seja Pessoa Física (PF) gerenciando seu orçamento doméstico ou Microempreendedor Individual (MEI) controlando suas contas operacionais — depende criticamente de **pontualidade nos pagamentos** e **disciplina no teto de despesas**.

Atualmente, o Dinheirizz dispõe de controle abrangente de transações recorrentes, vencimentos de contas e envelopes orçamentários por categoria. No entanto, o usuário precisa acessar ativamente a plataforma para visualizar seu fluxo de caixa. Na ausência de alertas pró-ativos:
1. **Inadimplência Involuntária e Juros:** Contas essenciais (concessionárias, boletos de fornecedores, DAS-MEI, aluguel) ou faturas de cartão de crédito acabam sendo esquecidas na correria do dia a dia, acarretando multas e juros abusivos.
2. **Estouro de Envelopes de Orçamento:** O usuário realiza compras sem notar que a categoria (ex: Alimentação, Lazer ou Logística) já atingiu 80% ou 100% do teto planejado, desequilibrando o fechamento do mês.

Como uma aplicação **Progressive Web App (PWA)** moderna construída com Vite 6 e React 19, o Dinheirizz deve utilizar a **Web Push API** nativa (W3C Push API + Notifications API) para atuar de forma ativa e preventiva. Isso permite notificar o usuário de maneira oportuna diretamente no dispositivo (computador de mesa ou smartphone Android / iOS com PWA instalado), mesmo com a aba fechada ou em segundo plano.

Esta especificação define os três pilares obrigatórios da solução:
1. **PWA & Service Worker (`VitePWA`):** Tratamento de eventos `'push'` com deserialização do payload e exibição nativa via `self.registration.showNotification`, e eventos `'notificationclick'` com roteamento direto para a tela de transações, faturas ou orçamentos.
2. **Backend Edge-Native BFF HonoJS & Banco Drizzle:** Rotas seguras para fornecimento de chave pública VAPID, gerenciamento de inscrições (`push_subscriptions`), gestão de preferências (`notification_preferences`), envio de push com criptografia WebCrypto compatível com Cloudflare Pages/Workers e endpoint de despacho de alertas em lote (`/api/v1/push/dispatch-alerts`).
3. **Experiência do Usuário (UI/UX) Anti-Slop & Dual-Theme:** Painel dedicado em `ProfileModal.tsx` com detecção de suporte do navegador, solicitação guiada de permissão, botão para envio de teste em tempo real, toggles granulares de antecedência e compatibilidade visual estrita com os temas **Dark Luxury** e **Light Clean**.

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
vite.config.ts                             # Configuração do VitePWA (plugins e service worker)
api/src/db/schema.ts                       # Schemas Drizzle ORM (users, transactions, budgets, creditCards, invoices)
api/src/services/crypto.ts                 # Implementação de WebCrypto nativa (crypto.subtle)
api/src/routes/budgets.ts                  # Lógica de cálculo de progresso e envelopes de orçamento
api/src/routes/transactions.ts             # Estrutura de transações e datas de vencimento (dueDate)
api/src/routes/invoices.ts                 # Faturas de cartão de crédito e datas de vencimento
src/components/modals/ProfileModal.tsx     # Modal de perfil onde residirão as configurações de notificação
src/contexts/ThemeContext.tsx              # Contexto de tema (Dark Luxury / Light Clean)
```

---

## 4. Escopo da Funcionalidade

### Está incluso (In Scope)

#### 4.1 Banco de Dados & Schemas Drizzle ORM (`api/src/db/schema.ts`)
1. **Tabela `push_subscriptions`:**
   - `id`: `uuid` PK padrão `defaultRandom()`.
   - `userId`: `uuid` FK para `users.id` com `onDelete: 'cascade'`, não nulo.
   - `endpoint`: `text` não nulo (URL de entrega do provedor de push do navegador).
   - `p256dh`: `text` não nulo (chave pública do cliente para derivação ECDH).
   - `auth`: `text` não nulo (segredo de autenticação do cliente de push).
   - `userAgent`: `text` opcional (identificação amigável do dispositivo, ex: "Chrome no Windows", "Safari no iOS").
   - `createdAt`: `timestamp` com timezone, default `now()`.
   - `updatedAt`: `timestamp` com timezone, default `now()`.
   - Índices: `push_subscriptions_user_id_idx` e `push_subscriptions_endpoint_idx`.

2. **Tabela `notification_preferences`:**
   - `id`: `uuid` PK padrão `defaultRandom()`.
   - `userId`: `uuid` FK para `users.id` com `onDelete: 'cascade'`, não nulo e único (`unique`).
   - `pushEnabled`: `boolean` default `true`, não nulo (chave geral de ativação).
   - `billsDueAlerts`: `boolean` default `true`, não nulo (alertas de contas a pagar).
   - `billsDueDaysBefore`: `integer` default `1`, não nulo (0 = no dia, 1 = 1 dia antes, 3 = 3 dias antes).
   - `budgetLimitAlerts`: `boolean` default `true`, não nulo (alertas de envelopes de orçamento).
   - `budgetThresholdPercent`: `integer` default `85`, não nulo (percentual de disparo: 80, 85, 90 ou 100).
   - `invoiceDueAlerts`: `boolean` default `true`, não nulo (fechamento e vencimento de faturas de cartão).
   - `createdAt`: `timestamp` com timezone, default `now()`.
   - `updatedAt`: `timestamp` com timezone, default `now()`.
   - Índice: `notification_preferences_user_id_idx`.

#### 4.2 Backend BFF HonoJS (`api/src/routes/push.ts` e `api/src/services/webPush.ts`)
1. **Serviço Edge-Native Web Push (`api/src/services/webPush.ts`):**
   - Utilização de `crypto.subtle` (Web Crypto API) para geração de assinaturas VAPID (RFC 8292) e cifragem do payload de notificação (RFC 8291), garantindo compatibilidade total com o runtime Edge do Cloudflare Pages / Workers sem dependência de módulos binários legados do Node.
   - Suporte a variáveis de ambiente:
     - `VAPID_PUBLIC_KEY`: Chave pública P-256 codificada em Base64URL.
     - `VAPID_PRIVATE_KEY`: Chave privada P-256 codificada em Base64URL.
     - `VAPID_SUBJECT`: Identificador do remetente (ex: `mailto:notificacoes@dinheirizz.com`).
   - Higiene automática de inscrições: quando o serviço push retornar status `404` ou `410` (Gone / Unregistered), a inscrição correspondente deve ser automaticamente deletada do banco de dados.
2. **Endpoints REST no BFF (`/api/v1/push/*`):**
   - `GET /api/v1/push/public-key`: Retorna a chave pública VAPID configurada no servidor (pública para clientes autenticados).
   - `GET /api/v1/push/preferences`: Retorna as preferências do usuário logado (cria o registro padrão caso não exista).
   - `PUT /api/v1/push/preferences`: Atualiza preferências com validação Zod estrita.
   - `POST /api/v1/push/subscribe`: Registra ou atualiza (`upsert`) a inscrição de push do usuário logado.
   - `DELETE /api/v1/push/unsubscribe`: Remove a inscrição do usuário logado a partir do endpoint informado.
   - `POST /api/v1/push/test`: Dispara uma notificação push de teste para todas as inscrições ativas do usuário logado para validação imediata do canal.
   - `POST /api/v1/push/dispatch-alerts`: Endpoint seguro (chamado sob demanda ou por cron/job) que:
     - Localiza transações a vencer (`transactions` onde `status = 'pending'`, `paid = false`, `dueDate` nos próximos `billsDueDaysBefore` dias).
     - Localiza envelopes orçamentários (`budgets`) cujo gasto acumulado no mês atual ultrapassou o teto definido por `budgetThresholdPercent`.
     - Localiza faturas abertas de cartão de crédito (`invoices` com status `'open'` e vencimento próximo).
     - Agrupa os alertas por usuário respeitando suas preferências individuais e dispara os pushes via Web Push.
     - Retorna métricas consolidadas: `{ totalUsersEvaluated, totalAlertsSent, expiredSubscriptionsRemoved }`.

#### 4.3 PWA & Service Worker (`public/sw-push.js` / VitePWA)
1. **Push Event Listener:**
   - Deserializa o payload JSON contendo:
     ```json
     {
       "title": "Conta a vencer amanhã!",
       "body": "Aluguel no valor de R$ 2.500,00 vence em 24h.",
       "icon": "/icon-192.png",
       "badge": "/icon-light-32x32.png",
       "data": {
         "url": "/?open=transactions&status=pending",
         "type": "bill_due"
       }
     }
     ```
   - Chama `self.registration.showNotification(title, options)` com vibração e ações quando suportado.
2. **Notification Click Listener:**
   - Fecha a notificação clicada via `event.notification.close()`.
   - Localiza clientes abertos da aplicação (`clients.matchAll({ type: 'window', includeUncontrolled: true })`).
   - Se já houver aba do Dinheirizz aberta, foca nela (`client.focus()`) e navega para a URL alvo. Caso contrário, abre nova janela (`clients.openWindow(url)`).
3. **Integração VitePWA (`vite.config.ts`):**
   - Inclusão do script de push no Service Worker sem quebrar o precache do VitePWA (`workbox.importScripts: ['/sw-push.js']`).

#### 4.4 Utilitários Client-Side & Custom Hooks (`src/lib/push/` e `src/hooks/`)
1. **`src/lib/push/pushClient.ts`:**
   - Funções utilitárias puras:
     - `isPushNotificationSupported()`: Verifica a presença de `serviceWorker`, `PushManager` e `Notification` na window.
     - `urlBase64ToUint8Array(base64String)`: Conversor da chave VAPID para registro no `PushManager`.
     - `subscribeBrowserPush(vapidPublicKey)`: Registra a inscrição no Service Worker.
     - `unsubscribeBrowserPush()`: Executa `pushSubscription.unsubscribe()`.
2. **`src/hooks/usePushNotifications.ts`:**
   - Integração com TanStack React Query v5.
   - Estado reativo de permissão do navegador (`'default' | 'granted' | 'denied' | 'unsupported'`).
   - Queries e mutations para buscar/atualizar preferências, registrar inscrição e disparar push de teste.

#### 4.5 Interface do Usuário (UI/UX) Anti-Slop & Dual-Theme
1. **Componente `PushNotificationSettings.tsx` (incorporado no `ProfileModal.tsx`):**
   - Cabeçalho limpo com ícone temático (`BellRing`), título institucional e badge indicando o status do navegador ("Ativo", "Pendente" ou "Bloqueado").
   - Botão de ativação principal com feedback visual claro e conformidade com touch target mínimo de 44x44px.
   - Caso a permissão esteja bloqueada no navegador (`denied`), exibe instruções claras e elegantes de como desbloquear nas configurações do navegador.
   - Seção de Preferências com switches (`data-testid="switch-bills-alert"`, `data-testid="switch-budget-alert"`, etc.) e seletores de antecedência.
   - Botão "Enviar Notificação de Teste" (`data-testid="btn-test-push"`) com estado de loading e feedback via toast.
   - Fidelidade estética rigorosa: Dark Luxury (`#0d0e12` com bordas sutis e acentos Neon Lime) e Light Clean (`#f8fafc` com bordas suaves e contraste WCAG AA).
2. **Banner Sutil no Dashboard (`PushNotificationBanner.tsx`):**
   - Banner opcional e dismissível que sugere ativação de alertas proativos para usuários que ainda não configuraram notificações.

---

### Está fora do escopo (Out of Scope)
```
- Envio de notificações via SMS, WhatsApp ou chamadas de voz.
- Disparo de notificações push nativas em apps compilados para Apple App Store / Google Play via Capacitor/Cordova (o foco é PWA Web Push W3C).
- Envio de e-mails transacionais adicionais (o fluxo de e-mails via Resend já foi tratado na Fase 1.5).
- Modificação dos templates de especificação specs/spec.md e specs/plan.md.
```

---

## 5. Contratos de Dados & API

### 5.1 Schemas Zod (`api/src/schemas/push.ts` e `src/schemas/push.ts`)

```typescript
import { z } from 'zod'

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'Chave pública p256dh é obrigatória'),
  auth: z.string().min(1, 'Segredo de autenticação auth é obrigatório')
})

export const subscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida'),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().optional()
})

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida')
})

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean(),
  billsDueAlerts: z.boolean(),
  billsDueDaysBefore: z.union([z.literal(0), z.literal(1), z.literal(3)]),
  budgetLimitAlerts: z.boolean(),
  budgetThresholdPercent: z.union([z.literal(80), z.literal(85), z.literal(90), z.literal(100)]),
  invoiceDueAlerts: z.boolean()
})

export type SubscribePushInput = z.infer<typeof subscribePushSchema>
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>
```

---

### 5.2 Endpoints REST HonoJS

```
# Headers obrigatórios em todas as rotas protegidas:
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

# 1. Obter Chave Pública VAPID
GET /api/v1/push/public-key
Response 200 OK:
{
  "vapidPublicKey": "BEl62iUYgUivxIkv69yViEuiBIa..."
}

# 2. Obter Preferências de Notificação do Usuário
GET /api/v1/push/preferences
Response 200 OK:
{
  "preferences": {
    "pushEnabled": true,
    "billsDueAlerts": true,
    "billsDueDaysBefore": 1,
    "budgetLimitAlerts": true,
    "budgetThresholdPercent": 85,
    "invoiceDueAlerts": true,
    "updatedAt": "2026-11-17T05:35:00Z"
  }
}

# 3. Atualizar Preferências de Notificação
PUT /api/v1/push/preferences
Request Body:
{
  "pushEnabled": true,
  "billsDueAlerts": true,
  "billsDueDaysBefore": 1,
  "budgetLimitAlerts": true,
  "budgetThresholdPercent": 90,
  "invoiceDueAlerts": true
}
Response 200 OK:
{
  "message": "Preferências de notificação atualizadas com sucesso",
  "preferences": { ... }
}

# 4. Registrar ou Atualizar Inscrição Web Push
POST /api/v1/push/subscribe
Request Body:
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5...",
    "auth": "tBHItJI5svbpez7KI4CCXg=="
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
Response 201 Created:
{
  "message": "Inscrição de push registrada com sucesso",
  "subscriptionId": "f7accc8b-e406-443c-b9c4-2c1845509723"
}

# 5. Cancelar Inscrição Web Push
DELETE /api/v1/push/unsubscribe
Request Body:
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
Response 200 OK:
{
  "message": "Inscrição de push cancelada com sucesso"
}

# 6. Disparar Notificação Push de Teste
POST /api/v1/push/test
Response 200 OK:
{
  "message": "Notificação de teste disparada com sucesso",
  "sentCount": 1
}

# 7. Processamento e Despacho de Alertas em Lote
POST /api/v1/push/dispatch-alerts
Response 200 OK:
{
  "success": true,
  "processedUsers": 12,
  "dispatchedAlerts": 15,
  "expiredSubscriptionsPruned": 0
}
```

---

### 5.3 Schema Drizzle ORM SQL (`api/src/db/schema.ts`)

```sql
-- Criação da tabela de inscrições Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);

-- Criação da tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  bills_due_alerts BOOLEAN DEFAULT TRUE NOT NULL,
  bills_due_days_before INTEGER DEFAULT 1 NOT NULL,
  budget_limit_alerts BOOLEAN DEFAULT TRUE NOT NULL,
  budget_threshold_percent INTEGER DEFAULT 85 NOT NULL,
  invoice_due_alerts BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx ON notification_preferences(user_id);
```

---

## 6. Arquivos que Serão Criados ou Alterados

```
CRIAR:
  api/src/schemas/push.ts                                # Schemas de validação Zod para rotas de Web Push
  api/src/services/webPush.ts                            # Serviço Edge-Native de cifragem e despacho Web Push (VAPID)
  api/src/routes/push.ts                                 # Router Hono com endpoints /api/v1/push/*
  api/tests/push-schemas.spec.ts                         # Testes unitários dos contratos Zod de push
  api/tests/push.spec.ts                                 # Testes de integração das rotas de push, preferências e envio
  public/sw-push.js                                      # Script de Service Worker para listeners 'push' e 'notificationclick'
  src/schemas/push.ts                                    # Schemas Zod compartilhados no frontend
  src/lib/push/pushClient.ts                             # Utilitários de conversão VAPID, inscrição e verificação de suporte
  src/hooks/usePushNotifications.ts                      # Custom Hook TanStack Query para orquestração de Web Push
  src/components/settings/PushNotificationSettings.tsx   # Painel visual de preferências de notificação (Dual-Theme & Anti-Slop)
  src/components/dashboard/PushNotificationBanner.tsx    # Banner de convite sutil de primeiro acesso no Dashboard
  src/tests/usePushNotifications.spec.tsx                # Testes unitários do hook de notificações
  src/tests/PushNotificationSettings.spec.tsx            # Testes de renderização, toggles, Dual-Theme e data-testid
  src/tests/qa-push-notifications-a11y-responsiveness.spec.tsx # Testes de acessibilidade WCAG AA e responsividade mobile

ALTERAR:
  api/src/db/schema.ts                                   # Inclusão das tabelas push_subscriptions e notification_preferences
  api/index.ts                                           # Registro do router /v1/push protegido com authMiddleware
  api/tests/setup.ts                                     # Adequação dos mocks do Drizzle e variáveis VAPID
  vite.config.ts                                         # Configuração de importScripts no VitePWA
  src/components/modals/ProfileModal.tsx                 # Inclusão da seção PushNotificationSettings
  src/components/dashboard/Dashboard.tsx                 # Exibição condicional do PushNotificationBanner
  specs/spec.55.md                                       # Esta especificação técnica
```

---

## 7. Estratégia de Testes (TDD)

### 🔴 Red — Testes que devem falhar antes do código de produção

1. **Schemas & Contratos (`api/tests/push-schemas.spec.ts`):**
   - Deve rejeitar inscrição com endpoint mal formatado ou chaves criptográficas (`p256dh`, `auth`) ausentes.
   - Deve validar e rejeitar preferências com percentuais de orçamento fora dos permitidos (ex: menor que 50% ou maior que 100%).
   - Deve validar e rejeitar dias de antecedência inválidos.
2. **Rotas Backend BFF (`api/tests/push.spec.ts`):**
   - `GET /api/v1/push/public-key`: Deve retornar status 200 com a chave pública VAPID configurada.
   - `GET /api/v1/push/preferences`: Deve retornar status 401 se não autenticado.
   - `PUT /api/v1/push/preferences`: Deve atualizar as preferências do usuário autenticado no banco de dados.
   - `POST /api/v1/push/subscribe`: Deve realizar o upsert da inscrição vinculando ao `userId`.
   - `DELETE /api/v1/push/unsubscribe`: Deve remover a inscrição associada ao endpoint informado.
   - `POST /api/v1/push/test`: Deve acionar o envio de notificação e retornar sucesso com contador de envios.
   - `POST /api/v1/push/dispatch-alerts`: Deve filtrar contas pendentes com vencimento iminente e faturas de cartão e disparar os pushes correspondentes.
3. **Frontend Hook & Client (`src/tests/usePushNotifications.spec.tsx`):**
   - Deve reportar corretamente quando o navegador não tem suporte a Push API (`isSupported: false`).
   - Deve gerenciar transições de permissão (`default` -> `granted` -> `denied`).
   - Deve integrar com o backend para salvar a inscrição gerada pelo `PushManager`.
4. **Interface Visual & Acessibilidade (`src/tests/PushNotificationSettings.spec.tsx` e `src/tests/qa-push-notifications-a11y-responsiveness.spec.tsx`):**
   - Deve renderizar todos os controles interativos com `data-testid` obrigatórios:
     - `data-testid="push-notifications-section"`
     - `data-testid="switch-push-master"`
     - `data-testid="switch-bills-due-alert"`
     - `data-testid="select-bills-days-before"`
     - `data-testid="switch-budget-limit-alert"`
     - `data-testid="select-budget-threshold"`
     - `data-testid="switch-invoice-due-alert"`
     - `data-testid="btn-test-push-notification"`
   - Deve manter conformidade com áreas de toque de no mínimo 44x44px em todos os switches e botões.
   - Deve validar ausência de overflow horizontal (`scrollWidth <= innerWidth`) em viewports mobile (`375px`, `390px`) e desktop.
   - Deve validar renderização idônea nos dois temas oficiais: **Dark Luxury** e **Light Clean**.

### 🟢 Green — Mínimo para fazer os testes passarem

1. Criar os schemas Zod em `api/src/schemas/push.ts` e exportar tipagens estritas.
2. Adicionar as tabelas `push_subscriptions` e `notification_preferences` em `api/src/db/schema.ts`.
3. Implementar `api/src/services/webPush.ts` utilizando WebCrypto API nativa (`crypto.subtle`).
4. Criar o router `api/src/routes/push.ts` e conectá-lo ao `api/index.ts` sob `/v1/push` protegido por `authMiddleware`.
5. Implementar `public/sw-push.js` e atualizar `vite.config.ts` para importar o script no Service Worker.
6. Implementar `src/lib/push/pushClient.ts` e o hook `src/hooks/usePushNotifications.ts`.
7. Criar `src/components/settings/PushNotificationSettings.tsx` e acoplá-lo ao `ProfileModal.tsx`.
8. Criar `src/components/dashboard/PushNotificationBanner.tsx` e acoplá-lo ao `Dashboard.tsx`.

### 🔵 Refactor — Oportunidades após o green

1. Centralizar tratamento de falhas e remoção em lote de endpoints mortos (`404`/`410`).
2. Otimizar renderização dos switches e seletores com microinterações suaves em Framer Motion.
3. Garantir mensagens amigáveis em português UTF-8 para todos os estados de erro e sucesso.

---

## 8. Critérios de Aceite (Definition of Done)

- [ ] **Tabelas Drizzle Criadas:** `push_subscriptions` e `notification_preferences` estruturadas em `api/src/db/schema.ts` com índices e relacionamentos CASCADE.
- [ ] **Contratos Zod Estritos:** `api/src/schemas/push.ts` e `src/schemas/push.ts` criados com validação tipada e zero `any`.
- [ ] **Rotas Hono Implementadas:** Endpoints `/api/v1/push/public-key`, `/api/v1/push/preferences`, `/api/v1/push/subscribe`, `/api/v1/push/unsubscribe`, `/api/v1/push/test` e `/api/v1/push/dispatch-alerts` operacionais e protegidos.
- [ ] **Web Push Edge-Native:** Cifragem e assinatura VAPID desenvolvidas utilizando `crypto.subtle` nativo, compatíveis com Cloudflare Pages/Workers sem pacotes Node C-binding legados.
- [ ] **Tratamento de Inscrições Expiradas:** Remoção automática imediata de assinaturas que responderem `404` ou `410` no provedor de push.
- [ ] **Service Worker PWA Integrado:** Eventos `'push'` exibem notificações com título, descrição, ícone e badge; eventos `'notificationclick'` direcionam para as rotas corretas da aplicação.
- [ ] **Painel de Configurações no ProfileModal:** Componente `PushNotificationSettings.tsx` implementado com toggles de contas a vencer, limite de orçamento, faturas de cartão e botão de teste de disparo.
- [ ] **Banner de Engajamento no Dashboard:** Componente `PushNotificationBanner.tsx` discreto e dismissível para convidar novos usuários a habilitarem os alertas.
- [ ] **Dual-Theme & Anti-Slop:** Componentes visuais 100% aderentes aos tokens de **Dark Luxury** e **Light Clean**, sem `!important`, sem gradientes excessivos de IA e com áreas de toque mínimas de 44x44px.
- [ ] **`data-testid` Obrigatório:** Todos os botões, switches e campos interativos possuem identificadores para testes automatizados.
- [ ] **Suíte de Testes Automatizados (Vitest):** 100% dos testes unitários e de integração de API e Frontend passando (`pnpm test`).
- [ ] **Auditoria de Padrões Aprovada:** Execução limpa de `pnpm standards:review` e `pnpm build` sem erros ou warnings residuais.
