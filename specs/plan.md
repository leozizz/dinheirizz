# plan.md
# Plano de Implementação — [Fase 2] Fundação Visual, Autenticação e Ações Rápidas (Dinheirizz 2.0)

> Gerado pelo agente após aprovação da `spec.md`.
> **Aguardando aprovação antes de qualquer escrita de código.**
> Arquivo local — não commitado (ver `specs/.gitignore`).

---

## Resumo do entendimento

A Issue #3 tem como objetivo construir a camada visual do frontend no Dinheirizz 2.0, consolidando o frontend SPA/PWA em Vite. O escopo contempla:
1. **Autenticação:** Integração minimalista com Supabase Auth (`src/lib/supabase.ts`, `AuthContext.tsx`, `LoginScreen.tsx`) suportando login com e-mail e botões sociais (Google/Apple).
2. **Dashboard Principal:** Card central de saldo com destaque, seções de resumo mensal (receitas/despesas) e listagem de transações recentes conectada ao BFF (`/api/v1/transactions`).
3. **Ações Rápidas:** Barra com 4 botões direcionados: Receber (abre modal em modo Receita), Despesa (abre modal em modo Despesa), Transferir (movimentação entre contas) e Pix (abre modal de carteira).
4. **Modais Interativos com Framer Motion:** Modal de Transações com efeito *slide-up* e Modal de Carteira Pix com seleção de chave, exibição de QR Code e ação de cópia.
5. **TDD:** Testes unitários com Vitest para todos os novos componentes de interface, preservando 100% de aprovação dos testes anteriores.

---

## Dúvidas e ambiguidades

- Nenhuma ambiguidade bloqueante. O Supabase Auth funcionará no cliente utilizando as credenciais já configuradas no `.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`), permitindo login por e-mail/senha com fallback seguro nos testes automatizados via mocks.

---

## Sequência de implementação

> Os passos seguem a ordem Red → Green → Refactor quando há testes envolvidos.
> Passo de teste vem antes do passo de implementação correspondente.

### Passo 1 — Branch de Trabalho, Client Supabase e Formatadores

**O que faz:**
- Criar e ativar a branch `feat/v2-visual-foundation` a partir de `main`.
- Criar `src/lib/supabase.ts` inicializando o client Supabase usando variáveis de ambiente do Vite.
- Criar `src/lib/formatters.ts` com funções utilitárias para formatação monetária (BRL) e datas.

**Arquivos criados/alterados:**
- CRIAR: `src/lib/supabase.ts`, `src/lib/formatters.ts`
**Teste:** Nenhum (utilitários de infraestrutura simples testados nas camadas superiores).

---

### Passo 2 — Autenticação e Sessão (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/Auth.spec.tsx` cobrindo renderização da tela de login, inputs de email/senha, botões sociais (Google/Apple) e estado de login/logout.
- **🟢 Green:**
  - Criar `src/contexts/AuthContext.tsx` provendo estado de autenticação, usuário ativo e métodos de login/logout.
  - Criar `src/components/auth/LoginScreen.tsx` com formulário Glassmorphism elegante, feedback de erro e botões OAuth.
- **🔵 Refactor:** Polimento visual e transições de tela com Framer Motion.

**Arquivos criados/alterados:**
- CRIAR: `src/tests/Auth.spec.tsx`, `src/contexts/AuthContext.tsx`, `src/components/auth/LoginScreen.tsx`
**Teste:** `src/tests/Auth.spec.tsx` — Vitest unitário com jsdom.

---

### Passo 3 — Dashboard Principal e Ações Rápidas (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/Dashboard.spec.tsx` testando renderização do card de saldo total, variação percentual, resumo mensal de receitas/despesas e lista de transações recentes.
- **🟢 Green:**
  - Criar `src/components/dashboard/QuickActions.tsx` com 4 botões direcionados: Receber, Despesa, Transferir e Pix.
  - Criar `src/components/dashboard/Dashboard.tsx` organizando saldo, ações rápidas e histórico de transações.
- **🔵 Refactor:** Ajustar tokens e classes `.glass-card-interactive` conforme `design-system.md`.

**Arquivos criados/alterados:**
- CRIAR: `src/tests/Dashboard.spec.tsx`, `src/components/dashboard/QuickActions.tsx`, `src/components/dashboard/Dashboard.tsx`
**Teste:** `src/tests/Dashboard.spec.tsx` — Vitest unitário com jsdom.

---

### Passo 4 — Modal de Transações com Framer Motion (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/TransactionModal.spec.tsx` testando abertura nos modos 'income', 'expense' e 'transfer', validação de valor monetário e submissão de dados para a API.
- **🟢 Green:** Criar `src/components/modals/TransactionModal.tsx` com animação *slide-up* (Framer Motion), seletor de categorias, contas, datepicker e input numérico.
- **🔵 Refactor:** Fechamento via backdrop e suporte a tecla Escape.

**Arquivos criados/alterados:**
- CRIAR: `src/tests/TransactionModal.spec.tsx`, `src/components/modals/TransactionModal.tsx`
**Teste:** `src/tests/TransactionModal.spec.tsx` — Vitest unitário.

---

### Passo 5 — Modal de Carteira Pix (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/PixWalletModal.spec.tsx` testando seleção de chave Pix em dropdown, visualização do QR Code e ação de cópia com clipboard.
- **🟢 Green:** Criar `src/components/modals/PixWalletModal.tsx` com animação Framer Motion, gerador visual de QR Code e botão de cópia de chave Pix.
- **🔵 Refactor:** Feedback visual de cópia com toast/sonner.

**Arquivos criados/alterados:**
- CRIAR: `src/tests/PixWalletModal.spec.tsx`, `src/components/modals/PixWalletModal.tsx`
**Teste:** `src/tests/PixWalletModal.spec.tsx` — Vitest unitário.

---

### Passo 6 — Integração no App.tsx e Validação Final

**O que faz:**
- Atualizar `src/App.tsx` para integrar o `AuthProvider`, alternância entre Login e Dashboard, e abertura dos modais via estado.
- Rodar suíte completa de testes (`pnpm test`) garantindo 100% de testes verdes.
- Rodar `pnpm build` garantindo bundle Vite e typecheck com 0 erros.

**Arquivos criados/alterados:**
- ALTERAR: `src/App.tsx`
**Teste:** `pnpm test` e `pnpm build`.

---

## Arquivos criados

```
src/lib/supabase.ts
src/lib/formatters.ts
src/contexts/AuthContext.tsx
src/components/auth/LoginScreen.tsx
src/components/dashboard/QuickActions.tsx
src/components/dashboard/Dashboard.tsx
src/components/modals/TransactionModal.tsx
src/components/modals/PixWalletModal.tsx
src/tests/Auth.spec.tsx
src/tests/Dashboard.spec.tsx
src/tests/TransactionModal.spec.tsx
src/tests/PixWalletModal.spec.tsx
```

## Arquivos alterados

```
src/App.tsx             # Integração com AuthContext, Dashboard e Modais
specs/spec.md           # Especificação técnica da Issue #3 preenchida
specs/plan.md           # Este plano de implementação
```

## Arquivos removidos

```
Nenhum
```

---

## Superfície de regressão

| Arquivo de teste | O que testa | Risco de quebra |
|------------------|-------------|-----------------|
| `api/tests/health.spec.ts` | Healthcheck do BFF | Baixo (sem alterações no backend) |
| `api/tests/transactions.spec.ts` | Rotas de transações e categorias | Baixo (sem alterações no backend) |
| `src/tests/App.spec.tsx` | Renderização base do frontend | Médio (App.tsx será refatorado para usar Auth e Dashboard) |

---

## Critérios de aceite × passos

| Critério (da spec, seção 8) | Atendido no Passo |
|-----------------------------|------------------|
| Nova branch `feat/v2-visual-foundation` criada a partir de `main` | Passo 1 |
| Tela de Autenticação minimalista com Supabase Auth em Glassmorphism | Passo 2 |
| Dashboard Principal com saldo em destaque e listagem de movimentações | Passo 3 |
| Barra de Ações Rápidas com 4 botões: Receber, Despesa, Transferir e Pix | Passo 3 |
| Modal de Transações com efeito slide-up (Framer Motion) | Passo 4 |
| Modal de Carteira Pix com seleção de chave, QR Code e cópia | Passo 5 |
| Testes no Vitest cobrindo os componentes da interface em TDD | Passos 2, 3, 4, 5 |
| Fidelidade visual ao `specs/design-system.md` (Glassmorphism e OKLCH) | Passos 2, 3, 4, 5 |
| Todos os testes automatizados passando com sucesso (`pnpm test`) | Passo 6 |

---

## O que está fora deste plano

- IA Consultor Financeiro com Gemini (Fase 4).
- Disparos automáticos de e-mail e relatórios com Resend (Fase 4).
- Cadastro/Edição de novas chaves Pix pelo usuário (Fase 3).
- Telas detalhadas de faturas e cartões (Fase 3).
