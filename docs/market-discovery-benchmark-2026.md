# Estudo de Discovery de Mercado, Benchmarking Competitivo e Evolução Visual (Unslop) — Dinheirizz 2.0

> **Data:** 21 de novembro de 2026  
> **Escopo:** Inteligência Competitiva, Auditoria Visual & UX Unslop, e Roadmap Acionável em 3 Horizontes  
> **Fontes Analisadas:** Repositório `leozizz/dinheirizz` (`api/`, `src/`, `docs/`), benchmarks nacionais (**Pierre**, **Minhas Finanças**, **Organizze**, **Mobills**) e globais (**Copilot Money**, **Monarch Money**, **YNAB**), além de padrões de UI/UX no **Dribbble** e **Mobbin**.

---

## 1. Raio-X do Dinheirizz Hoje (Base Verificada no Repositório)

O **Dinheirizz 2.0** possui uma arquitetura moderna e robusta, construída sobre **React 19 + Vite 6 (PWA)**, **Tailwind CSS v4**, **Radix UI / shadcn**, **TanStack React Query**, **Hono 4** (Cloudflare Pages Functions / BFF), **Drizzle ORM + Supabase (PostgreSQL + RLS)** e **Resend**.

### Capacidades já implementadas
- **Core Financeiro (`api/src/routes/`):**
  - Gestão de contas (`accounts.ts`), transferências entre contas (`transfers.ts`) e carteira de chaves Pix (`pix.ts`).
  - Transações com suporte a recorrência, parcelamento, status (`completed`, `pending`, `cancelled`), baixa rápida e operações em lote (`transactions.ts`).
  - Gestão de cartões de crédito, limites, faturas e antecipação de parcelas (`creditCards.ts`, `invoices.ts`).
  - Orçamentos mensais por categoria / *Budget Envelopes* (`budgets.ts`) e calendário financeiro interativo (`FinancialCalendar.tsx`).
- **Inteligência, Previsão & Automação:**
  - Previsão diária de saldo e fluxo de caixa para 30/60 dias com *burn rate* e ponto mínimo (`forecast.ts`, `ForecastCard.tsx`).
  - Importação de extratos **CSV, OFX e PDF** com deduplicação automática (`import.ts`, `src/lib/deduplication.ts`).
  - Leitura de comprovantes/recibos via Gemini OCR (`aiReceipt.ts`, `ReceiptScannerDropzone.tsx`).
  - Consultor financeiro com IA (suporte **BYOK** — *Bring Your Own Key* para Gemini + fallback analítico determinístico sem IA em `insights.ts`, `userAi.ts`).
  - Exportação de relatórios CSV e PDF/Print (`reports.ts`) e notificações Web Push (`push.ts`).
- **Segurança & Design System:**
  - Criptografia client-side via Web Crypto API (`src/lib/crypto.ts`, `encryptedStorage.ts`) e isolamento BFF.
  - Tema duplo (`dark` Dark Luxury `#0d0e12` + Lima `#7bc816` e `light` Light Clean em `src/index.css`).

---

## 2. Inteligência Competitiva (Bater a Concorrência)

### 2.1. Perfil dos Principais Concorrentes Analisados

1. **Pierre (Brasil — adquirido pela CloudWalk / InfinitePay):**
   - **Posicionamento:** Abandona planilhas e gráficos complexos em favor de **Open Finance (+100 instituições)** e **agentes de IA conversacionais** (*"chat do seu jeito"*).
   - **Pontos fortes:** Zero preenchimento manual; detecção proativa de cobranças duplicadas, parcelas esquecidas e assinaturas recorrentes; ecossistema próprio (CDB MIAU, cartão Pierre One).
2. **Minhas Finanças (Brasil):**
   - **Posicionamento:** Controle financeiro pessoal/profissional completo e multiplataforma (Android, iOS, Windows, macOS + Sync em nuvem).
   - **Pontos fortes:** Open Finance (+100 bancos) com conciliação inteligente; assistente IA **Mia** com lançamentos por linguagem natural e leitura de recibos; **integração via protocolo MCP** com ChatGPT, Claude e Perplexity; múltiplos perfis (PF/PJ), múltiplas moedas e metas de longo prazo.
3. **Organizze & Mobills (Brasil):**
   - **Organizze:** Referência em **simplicidade e velocidade** no lançamento manual ("zero atrito", registro em segundos).
   - **Mobills:** Referência em **gestão de cartões de crédito** (melhor dia de compra, faturas complexas), planejamento mensal e gamificação de metas.
4. **Copilot Money, Monarch Money & YNAB (Benchmarks Globais):**
   - **Copilot Money:** Padrão ouro em **UI/UX** (Apple Design Award), categorização por IA adaptativa, rastreamento automático de assinaturas e investimentos lado a lado com o fluxo de caixa.
   - **Monarch Money:** Painel consolidado de **Patrimônio Líquido (Net Worth)**, **modo casal/família** compartilhado e regras automáticas customizáveis.
   - **YNAB:** Metodologia ativa de **orçamento base-zero** com rollover estruturado de envelopes.

### 2.2. Tabela Comparativa de Funcionalidades

| Capacidade / Pilar | **Dinheirizz (Hoje)** | **Pierre** (BR) | **Minhas Finanças** (BR) | **Organizze / Mobills** (BR) | **Monarch / Copilot** (Global) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Controle Manual + Recorrências + Parcelas** | ✅ Completo | ⚠️ Secundário | ✅ Completo | ✅ Completo | ✅ Completo |
| **Cartões de Crédito, Faturas & Antecipação** | ✅ Forte | ✅ Via Open Finance | ✅ Forte | ✅ Muito forte (Mobills) | ⚠️ Básico |
| **Previsão de Saldo (30/60d) & Calendário** | ✅ Nativo | ⚠️ Via IA | ✅ Saldo futuro | ✅ Parcial | ✅ Fluxo de caixa |
| **Importação de Extratos (CSV/OFX/PDF)** | ✅ Com deduplicação | ❌ Não precisa (OF) | ✅ OFX/CSV | ✅ OFX/CSV | ✅ CSV |
| **Open Finance Brasil (Sync Bancário)** | ❌ Ausente | ✅ +100 bancos | ✅ +100 bancos | ✅ Em planos pagos | ✅ Plaid/MX (EUA) |
| **IA Conversacional (Chat & Lançamento NLP)** | ❌ Só card estático | ✅ Core do produto | ✅ Assistente "Mia" + MCP | ❌ Ausente/Básico | ✅ Categorização adaptativa |
| **Detecção de Assinaturas & Anomalias** | ❌ Ausente | ✅ Proativo | ⚠️ Relatórios IA | ❌ Ausente | ✅ Rastreador dedicado |
| **Patrimônio Líquido (Investimentos / Dívidas)** | ❌ Só saldo em conta | ✅ Visão unificada + CDB | ✅ Investimentos | ⚠️ Básico | ✅ Net Worth completo |
| **Perfis Múltiplos (PF/PJ) & Modo Casal** | ❌ Conta única | ❌ Individual | ✅ Múltiplos perfis | ❌ Individual | ✅ Modo Casal (Monarch) |
| **Privacidade / Soberania (BYOK + Crypto)** | ✅ Diferencial forte | ❌ Ecossistema fechado | ⚠️ Nuvem padrão | ⚠️ Nuvem padrão | ⚠️ Nuvem padrão |

### 2.3. Onde Estamos Perdendo em Conversão, Onboarding e Retenção

1. **Empty State do Modo Demonstração e Primeiro Acesso:**
   - Na landing page, o usuário clica em *"Explorar modo demonstração"* e cai no dashboard. Nos screenshots auditados (`docs/screenshots/dashboard-dark-desktop-1280.png`), os 4 cards da **Visão Geral** (*A Pagar, A Receber, Cartão de Crédito, Transferências*) aparecem zerados (`R$ 0,00`), reduzindo o valor percebido nos primeiros 5 segundos.
   - Falta também um fluxo guiado (checklist de 3 passos) para novos usuários cadastrados.
2. **Fricção no Registro Diário (Retenção D7/D30):**
   - Sem Open Finance e sem lançamento por linguagem natural (`⌘K`), registrar um gasto exige abrir um modal completo e preencher múltiplos campos — perdendo em agilidade para o `Organizze` e em automação para o `Pierre` e `Minhas Finanças`.
3. **IA Passiva vs. IA Acionável:**
   - O `AiInsightsCard` gera apenas um resumo estático sob demanda, enquanto os líderes oferecem chat contextual sobre as próprias transações e ações assistidas.
4. **Falta de Visão Patrimonial, Metas (Caixinhas) e Separação PF/PJ:**
   - Usuários que amadurecem financeiramente precisam acompanhar metas de longo prazo e separar finanças pessoais de trabalho autônomo/PJ.

### 2.4. Diferenciais Estratégicos Viáveis para o Dinheirizz

Em vez de competir com bancos/adquirentes em oferta de crédito ou CDB proprietário, o Dinheirizz pode liderar em três frentes altamente viáveis:
1. **Soberania, Privacidade & Zero Monetização de Dados:** Posicionar o produto como um *"cofre financeiro privado com IA sob seu controle"* (BYOK Gemini + criptografia client-side + zero venda de dados/empréstimos).
2. **Velocidade de Comando (`⌘K` + Linguagem Natural) + Projeção Diária:** Combinar lançamento instantâneo por texto livre com o motor de **Forecast 30/60d** e **Calendário Financeiro**, que já é superior ao da maioria dos apps nacionais.
3. **Ecossistema Aberto para Builders & Power Users (MCP Pessoal):** Expor um servidor/endpoint MCP escopado (somente leitura por padrão) para conectar finanças pessoais ao Claude, ChatGPT e automações próprias.

---

## 3. Discovery Visual & UX Unslop (Referências Modernas)

Cruzando referências atuais do **Dribbble / Mobbin** (Copilot Money, Mercury, Revolut, Linear) com a auditoria direta das telas e código do Dinheirizz (`docs/screenshots/`, `docs/ux-audit/`, `src/`):

### 3.1. Padrões Modernos que Superam Nossa UI Atual
- **Bento Grid Assimétrico no Desktop:** Substituir o empilhamento em coluna única (`max-w-4xl` em `Dashboard.tsx`, que gera >2200px de scroll) por um grid de 12 colunas (`max-w-6xl` / `max-w-7xl`), colocando Hero de Saldo + Ações Rápidas, Forecast + Donut e Contas/Cartões em blocos proporcionais e altamente escaneáveis.
- **Command Palette Global (`⌘K`):** Utilizar o pacote `cmdk` (já presente em `package.json`) para busca instantânea de transações, atalhos de navegação, troca de tema e lançamento rápido via linguagem natural.
- **Controles Customizados com Imersão Glassmorphism:** Substituir `<select>` e `<input type="date">` nativos por `@radix-ui/react-select` e `react-day-picker` (ambos já instalados em `package.json`), eliminando o *wheel picker* nativo do iOS/PWA.

### 3.2. Pontos Datados, "AI Slop" e Regressões Encontradas
1. **Jargão Técnico Exposto no Header (`src/App.tsx:983`):** Exibição de `2.0 PWA` e `Cloudflare Pages & BFF` para o usuário final, quebrando a percepção de produto consumer/fintech maduro.
2. **Banner Demo com Gradiente Genérico (`src/App.tsx:1054`):** Uso de gradiente azul-roxo saturado no banner *"Modo de demonstração"*.
3. **Regressões de Contraste no Tema Claro & Tokens Hardcoded:**
   - Evidenciado em `docs/screenshots/dashboard-light-desktop-1280.png`: título do `ForecastCard` com baixa legibilidade no tema claro e botão `Entrar` com baixo contraste.
   - Presença de classes hardcoded de tema escuro (`border-white/10`, `bg-white/10`, `text-neutral-400`, `bg-zinc-900/95`) em `AiInsightsCard.tsx`, `AccountsBar.tsx`, `CashFlowChart.tsx` e `Dashboard.tsx`.
4. **Animações `animate-pulse` Decorativas:** Uso de `animate-pulse` em badge estático (`Ativo` em `Dashboard.tsx:340`) e ícone `Sparkles` (`AiInsightsCard.tsx:86`).

---

## 4. Proposta de Roadmap & Backlog Acionável (3 Horizontes)

### Horizonte 1 — Vitórias Rápidas (Alto Impacto / Baixo Esforço)
1. **`[UX/Unslop]` Remover jargão técnico do Header, limpar banner Demo e corrigir tokens Light Mode** (`P0`)
2. **`[UX/Onboarding]` Enriquecer dados do Modo Demonstração e criar Empty State guiado** (`P0`)
3. **`[UX/Design System]` Substituir `<select>` e `<input type="date">` nativos por Radix Select e DatePicker customizado** (`P1`)

### Horizonte 2 — Paridade Competitiva (Must-Have)
4. **`[UX/Frontend]` Reestruturar Dashboard Desktop para Bento Grid Responsivo** (`P1`)
5. **`[Feature]` Command Bar Global (`⌘K`) e Lançamento Rápido por Linguagem Natural** (`P1`)
6. **`[Feature]` Rastreador Automático de Assinaturas e Contas Recorrentes** (`P2`)
7. **`[Feature]` Múltiplos Perfis Financeiros (Pessoal / PJ) e Metas de Economia (Caixinhas)** (`P2`)

### Horizonte 3 — Apostas de Liderança (Diferenciais)
8. **`[AI/Differentiator]` Copiloto Financeiro Conversacional com Contexto Real (Chat + Ações)** (`P1 — Estratégica`)
9. **`[Integration]` Motor de Conexão Bancária via Open Finance Brasil (Pluggy / Belvo)** (`P2 — Estratégica`)
10. **`[Differentiator]` Servidor MCP Pessoal & Automações para Usuários Avançados** (`P3 — Diferencial`)

---

*Documento consolidado como referência oficial de Discovery e Backlog Estratégico do Dinheirizz.*
