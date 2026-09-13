# plan.md
# Plano de Implementação — [Fase 1.8] Hardening de Autenticação: Validação Avançada de Cadastro, Confirmação de Senha e Ofuscação de Payload (BFF)

> Gerado pelo agente após preenchimento da `spec.md`.
> **Aguardando aprovação antes de qualquer escrita de código.**
> Arquivo local — não commitado (ver `specs/.gitignore`).

---

## Resumo do entendimento

A Issue #13 tem como objetivo enriquecer e blindar a autenticação do Dinheirizz 2.0:
1. **Validação Estrita de Formulários:** Schemas Zod compartilhados para login e cadastro, com regras de força de senha, correspondência de senhas (match/mismatch em tempo real), nome completo e username único.
2. **Evolução do BD e BFF (Preparação para Google & Apple OAuth):** Adição dos campos `username`, `provider` e `updated_at` na tabela `users` do Drizzle, além dos endpoints protegidos `POST /api/v1/users/sync` (upsert resiliente a partir de JWT e metadados) e `GET /api/v1/users/me` (perfil sanitizado).
3. **Ofuscação e Segurança de Payload:** Ativação de `secureHeaders` no runtime HonoJS e sanitização de respostas para evitar vazamento de credenciais e metadados nos DevTools do navegador.
4. **Comunicação com Sub-issues:** Publicação de comentários nas issues #8 e #9 detalhando o terreno preparado para receber os futuros logins OAuth.

---

## Dúvidas e ambiguidades

Nenhuma — o Supabase Auth já suporta gravação de metadados em `options.data` no método `signUp`, o Drizzle ORM gerencia a tabela `users` no PostgreSQL e o Hono possui suporte nativo a `secureHeaders`.

---

## Sequência de implementação

> Os passos seguem a ordem Red → Green → Refactor quando há testes envolvidos.
> Passo de teste vem antes do passo de implementação correspondente.

### Passo 1 — Schemas Zod de Validação (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/AuthValidation.spec.tsx` testando os schemas de validação para cadastro (mínimo de caracteres para Nome Completo, formato de Username, força mínima da senha de 8 dígitos com letras e números, e falha na correspondência entre Senha e Confirmação de Senha).
- **🟢 Green:**
  - Criar `src/schemas/auth.ts` exportando `loginSchema` e `signUpSchema` com validações rigorosas e mensagens em português.
  - Criar `api/src/schemas/auth.ts` com schemas compatíveis para validação de requisições no BFF.
- **🔵 Refactor:** Compartilhar definições e tipos inferidos (`z.infer<typeof ...>`).

**Arquivos criados/alterados:**
- CRIAR: `src/schemas/auth.ts`, `api/src/schemas/auth.ts`, `src/tests/AuthValidation.spec.tsx`
**Teste:** `src/tests/AuthValidation.spec.tsx` — Vitest unitário.

---

### Passo 2 — Evolução do BD, Unificação Multi-provedor e Endpoints de Usuário no BFF (TDD)

**O que faz:**
- **🔴 Red:** Criar `api/tests/users.spec.ts` testando:
  - `GET /api/v1/users/me` (401 sem token, 200 com perfil sanitizado quando autenticado).
  - `POST /api/v1/users/sync` (401 sem token, 200 realizando upsert dos dados do usuário com provider 'email', 'google' ou 'apple').
  - **Account Linking / Multi-provider reconciliation:** Se o mesmo email já existe no banco (ex: cadastrado via email/senha) e um sync chega com outro provider (ex: google ou apple), o usuário existente é reconciliado adicionando o novo provider ao array `providers` sem gerar erro de chave duplicada.
- **🟢 Green:**
  - Atualizar `api/src/db/schema.ts` adicionando `username`, `provider`, `providers` (array) e `updatedAt` na tabela `users`.
  - Atualizar `api/tests/setup.ts` para mockar operações de consulta e upsert de usuários no Drizzle.
  - Criar `api/src/routes/users.ts` com handlers protegidos por `authMiddleware`, com lógica de merge/reconciliação para evitar duplicidade de contas por e-mail.
  - Plugar `app.route('/v1/users', usersRouter)` em `api/index.ts`.
- **🔵 Refactor:** Garantir retorno sanitizado sem vazar chaves internas.

**Arquivos criados/alterados:**
- CRIAR: `api/src/routes/users.ts`, `api/tests/users.spec.ts`
- ALTERAR: `api/src/db/schema.ts`, `api/index.ts`, `api/tests/setup.ts`
**Teste:** `api/tests/users.spec.ts` — Vitest integração Hono.

---

### Passo 3 — Headers de Segurança HTTP e Ofuscação de Payload no BFF

**O que faz:**
- Configurar middleware de headers de segurança (`secureHeaders`) em `api/index.ts` protegendo contra clickjacking, MIME sniffing e XSS.
- Adicionar sanitizador de erros globais para garantir que detalhes de stack trace e segredos não sejam expostos ao cliente.

**Arquivos criados/alterados:**
- ALTERAR: `api/index.ts`
**Teste:** `api/tests/health.spec.ts` e `api/tests/users.spec.ts` — verificar presença dos headers de segurança.

---

### Passo 4 — Formulário de Cadastro Enriquecido e Validação Dinâmica (TDD)

**O que faz:**
- **🔴 Red:** Adicionar testes em `src/tests/AuthValidation.spec.tsx` e ajustar `src/tests/Auth.spec.tsx` para cobrir a exibição e validação dos campos Nome Completo, Username e Confirmação de Senha na aba "Criar conta".
- **🟢 Green:**
  - Atualizar `src/contexts/AuthContext.tsx` estendendo `signUp` para aceitar `fullName` e `username` repassando via `options.data`.
  - Atualizar `src/components/auth/LoginScreen.tsx` adicionando os novos campos com validação em tempo real de correspondência de senha, indicador de força e mensagens amigáveis de erro.
  - Chamar a sincronização automática com o BFF após cadastro/login bem-sucedido.
- **🔵 Refactor:** Polimento visual em Glassmorphism com paddings e touch targets HIG (≥44px).

**Arquivos criados/alterados:**
- ALTERAR: `src/contexts/AuthContext.tsx`, `src/components/auth/LoginScreen.tsx`, `src/tests/Auth.spec.tsx`
**Teste:** `src/tests/AuthValidation.spec.tsx` e `src/tests/Auth.spec.tsx` — Vitest com React Testing Library.

---

### Passo 5 — Documentação Técnica nas Sub-Issues #8 e #9

**O que faz:**
- Publicar comentários nas issues #8 (Google) e #9 (Apple) via GitHub MCP registrando que o schema de banco de dados (`users`) e os endpoints de sincronização (`POST /api/v1/users/sync`) já estão prontos para receber os metadados dos provedores sociais quando as credenciais externas forem liberadas.

**Arquivos criados/alterados:** Nenhum (chamada de API do GitHub MCP).
**Teste:** N/A.

---

### Passo 6 — Validação Completa da Suíte de Testes e Build

**O que faz:**
- Executar `pnpm test` cobrindo 100% dos testes da aplicação.
- Executar `pnpm build` validando bundle e tipagem TypeScript estrita sem erros.

**Arquivos criados/alterados:** Nenhum.
**Teste:** `pnpm test` e `pnpm build`.

---

## Arquivos criados

```
src/schemas/auth.ts
api/src/schemas/auth.ts
api/src/routes/users.ts
api/tests/users.spec.ts
src/tests/AuthValidation.spec.tsx
```

## Arquivos alterados

```
api/src/db/schema.ts                 # Adição das colunas username, provider e updatedAt na tabela users
api/index.ts                         # Registro de secureHeaders e rota /v1/users
api/tests/setup.ts                   # Mocks do Drizzle para queries de usuários
src/contexts/AuthContext.tsx         # Suporte a fullName e username no signUp
src/components/auth/LoginScreen.tsx  # Campos de cadastro e validação dinâmica de senha
src/tests/Auth.spec.tsx              # Adequação dos testes com os novos campos
specs/spec.md                        # Atualização da especificação
specs/plan.md                        # Este plano de implementação
```

## Arquivos removidos

```
Nenhum
```

---

## Superfície de regressão

| Arquivo de teste | O que testa | Risco de quebra |
|------------------|-------------|-----------------|
| `src/tests/Auth.spec.tsx` | Formulário e fluxo de autenticação | Médio (aba de cadastro terá novos campos obrigatórios) |
| `api/tests/auth-middleware.spec.ts` | Validação de JWT no BFF | Baixo (middleware será reutilizado pelas novas rotas) |
| `api/tests/transactions.spec.ts` | Rotas de transações | Baixo (sem alteração nos endpoints de transação) |
| `api/tests/health.spec.ts` | Healthcheck do backend | Baixo |
| `src/tests/App.spec.tsx` | Renderização do shell principal | Baixo |
| `src/tests/Dashboard.spec.tsx` | Dashboard principal | Baixo |
| `src/tests/TransactionModal.spec.tsx` | Modal de transação | Baixo |
| `src/tests/PixWalletModal.spec.tsx` | Carteira Pix | Baixo |

---

## Critérios de aceite × passos

| Critério (da spec, seção 8) | Atendido no Passo |
|-----------------------------|------------------|
| Formulário de cadastro atualizado com Nome, Username, Confirmação de Senha | Passo 4 |
| Validação dinâmica com feedback de correspondência de senhas | Passos 1 e 4 |
| Validação de força mínima de senha e Zod schemas | Passos 1 e 4 |
| Persistência de metadados no Supabase Auth (`raw_user_meta_data`) | Passo 4 |
| Tabela `users` do Drizzle atualizada com `username`, `provider` e `updated_at` | Passo 2 |
| Endpoint `POST /api/v1/users/sync` para criação/upsert de perfil (incluindo Google e Apple) | Passo 2 |
| Endpoint `GET /api/v1/users/me` retornando perfil sanitizado | Passo 2 |
| Headers de segurança HTTP (`secureHeaders`) no BFF | Passo 3 |
| Comentários de documentação nas sub-issues #8 e #9 | Passo 5 |
| 100% dos testes passando no Vitest (`pnpm test`) e build limpo (`pnpm build`) | Passo 6 |

---

## O que está fora deste plano

- Obtenção de credenciais de produção no Google Cloud Console (#8) e Apple Developer (#9).
- Recuperação de senha por e-mail com deep link ("Esqueci minha senha").
- Múltiplos fatores de autenticação (MFA/2FA).

