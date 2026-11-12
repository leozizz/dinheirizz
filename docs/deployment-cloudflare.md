# 🚀 Guia de Deploy e Operação no Cloudflare Pages — Dinheirizz

> **Documento Oficial de Engenharia & DevOps**  
> **Aplicação:** Dinheirizz (Gestão Financeira Pessoal e Empresarial)  
> **Stack:** React 19, TypeScript estrito, Vite 6, Tailwind CSS, Hono API (Edge Functions), Drizzle ORM, Supabase PostgreSQL, Cloudflare Pages.

---

## 1. Visão Geral da Arquitetura

O Dinheirizz foi projetado com uma arquitetura híbrida de alta performance:
- **Frontend SPA:** Single Page Application construída com React 19 + Vite, gerando assets estáticos otimizados na pasta `dist/`.
- **Backend Edge API (BFF):** API Hono integrada via **Cloudflare Pages Functions** (`functions/api/[[route]].ts`), interceptando requisições sob o prefixo `/api/*` e executando no edge runtime da Cloudflare com suporte a `nodejs_compat`.
- **Banco de Dados Relacional:** Supabase PostgreSQL gerenciado com **Drizzle ORM** (`api/src/db/`).

```
                ┌─────────────────────────────────────────────────────┐
                │                  Cloudflare Pages                   │
                │                                                     │
Cliente HTTP ──►│  /api/*  ──► Pages Functions (Hono API em Edge)    │──► Supabase PostgreSQL
                │                                                     │    (Drizzle ORM)
                │  /*      ──► Assets Estáticos SPA (dist/)           │
                └─────────────────────────────────────────────────────┘
```

---

## 2. Auditoria e Estado das Migrações Drizzle

### 2.1. Diagnóstico Realizado
Durante a preparação para o primeiro deploy em Produção, realizamos a auditoria completa de schema e tabelas:
- **7 migrações SQL** no repositório (`drizzle/`):
  1. `0000_lively_mystique.sql` (Criação de `users`, `accounts`, `categories`, `transactions`, `pix_keys`)
  2. `0001_add_user_profile_columns.sql` (Colunas de perfil em `users`)
  3. `0002_create_insights_table.sql` (Tabela de cache de `insights`)
  4. `0003_byok_and_roles.sql` (Campos de controle de acesso e chaves BYOK)
  5. `0004_overrated_veda.sql` (Tabela `user_ai_settings`, parcelamento e recorrência em `transactions`)
  6. `0005_slow_phil_sheldon.sql` (Ajuste de dia útil e recorrência em `transactions`)
  7. `0006_luxuriant_gressill.sql` (Tabelas `budgets`, `verification_tokens` e coluna `email_verified` em `users`)

### 2.2. Ação de Sincronização Executada
A migração `0006_luxuriant_gressill.sql` estava pendente no banco remoto. Foi executado o sincronizador `scripts/sync_and_apply_migrations.mjs`, que:
1. Registrou formalmente os hashes das migrações anteriores na tabela `drizzle.__drizzle_migrations`.
2. Aplicou a migração `0006` via driver nativo do Drizzle ORM, criando `budgets`, `verification_tokens` e `users.email_verified`.
3. Validou a integridade estrutural de todas as 9 tabelas do schema público.

### 2.3. Comandos Úteis para o Banco
- **Verificar status do banco e migrações:**
  ```bash
  pnpm db:status
  ```
- **Gerar novas migrações a partir do TypeScript schema:**
  ```bash
  pnpm db:generate
  ```
- **Aplicar migrações pendentes:**
  ```bash
  pnpm db:migrate
  ```

> [!NOTE]
> A tabela física `transfers` não existe isolada no banco porque transferências são registradas como transações vinculadas na tabela `transactions` com tipo `'transfer'`.

---

## 3. Matriz de Variáveis de Ambiente (Environment Variables)

A aplicação consome variáveis em dois momentos distintos: **Build Time** (injetadas no bundle JS pelo Vite) e **Runtime** (injetadas no edge worker das Functions pela Cloudflare).

### 3.1. Variáveis de Build Time (Frontend / SPA)
Estas variáveis começam com `VITE_` e são gravadas diretamente no HTML/JS no momento em que `pnpm build` roda.

| Variável | Obrigatória | Onde Configurar | Descrição / Exemplo |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **SIM** | Cloudflare Pages (Build & Runtime) | URL da instância do Supabase. Ex: `https://<id>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **SIM** | Cloudflare Pages (Build & Runtime) | Chave pública anônima do Supabase (`anon` key). |
| `NODE_VERSION` | **SIM** | Cloudflare Pages (Build) | Versão do Node para o build. Recomendado: `20.18.0` ou `22`. |

### 3.2. Variáveis de Runtime (Pages Functions / API Backend)
Estas variáveis são consumidas dinamicamente pela API Hono no Cloudflare (`c.env` / `process.env`). **Devem ser marcadas como "Encrypt" (Secret)** no painel da Cloudflare.

| Variável | Obrigatória | Sensível (Secret) | Descrição / Exemplo |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **SIM** | **SIM** | String de conexão PostgreSQL do Supabase (com pooler `aws-0-sa-east-1.pooler.supabase.com:6543/postgres` ou conexão direta). |
| `SUPABASE_JWT_SECRET` | **SIM** | **SIM** | Segredo JWT do Supabase (Dashboard > Project Settings > API > JWT Secret). Usado para validar tokens Bearer dos usuários. |
| `JWT_SECRET` | Opcional | **SIM** | Alias alternativo para `SUPABASE_JWT_SECRET`. |
| `SUPABASE_URL` | Recomendado | Não | Mesma URL do Supabase, lida pelo backend para sincronização e auth. |
| `SUPABASE_ANON_KEY` | Recomendado | Não | Chave anônima lida pelo backend. |
| `AI_ENCRYPTION_KEY` | **SIM** | **SIM** | String secreta de exatamente **32 caracteres** utilizada para encriptar chaves BYOK de IA (AES-256) na tabela `user_ai_settings`. |
| `GEMINI_API_KEY` | Recomendado | **SIM** | Chave da Google Gemini API para usuários corporativos / tier padrão sem chave própria. |
| `RESEND_API_KEY` | Recomendado | **SIM** | Chave de API do Resend (`re_...`) para envio de e-mails transacionais (boas-vindas, verificação de e-mail). |
| `EMAIL_FROM` | Opcional | Não | Remetente dos e-mails. Ex: `Dinheirizz <nao-responda@dinheirizz.com>`. Se omitido, usa `Dinheirizz <onboarding@resend.dev>`. |
| `ENVIRONMENT` | Automático | Não | Já configurado em `wrangler.toml` como `production`. |

> [!CAUTION]
> **Nunca** exponha `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `AI_ENCRYPTION_KEY` ou `RESEND_API_KEY` com o prefixo `VITE_`. Elas devem permanecer estritamente no ambiente do servidor (Functions).

---

## 4. Passo a Passo de Deploy no Cloudflare Pages

### Método A: Deploy Contínuo via GitHub (Recomendado)

1. **Acessar o Painel da Cloudflare:**
   - Faça login em [dash.cloudflare.com](https://dash.cloudflare.com/).
   - No menu lateral, acesse **Workers & Pages** > selecione **Create application** > aba **Pages** > **Connect to Git**.

2. **Selecionar o Repositório:**
   - Conecte sua conta do GitHub e selecione o repositório `dinheirizz` (ou `leozizz/dinheirizz`).
   - Selecione o branch de produção (geralmente `main`).

3. **Configurações de Build:**
   - **Project name:** `dinheirizz` (ou nome desejado)
   - **Production branch:** `main`
   - **Framework preset:** `Vite` (ou `None`)
   - **Build command:** `pnpm build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (deixe vazio ou `/`)

4. **Configurar Variáveis de Ambiente no Painel:**
   Antes de salvar e disparar o primeiro build, expanda **Environment variables**:
   - `NODE_VERSION`: `20.18.0`
   - `VITE_SUPABASE_URL`: `https://<seu-projeto>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `<sua-chave-anon>`
   - `DATABASE_URL`: `postgresql://postgres.<projeto>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
   - `SUPABASE_JWT_SECRET`: `<jwt-secret-do-supabase>`
   - `AI_ENCRYPTION_KEY`: `<chave-aes-32-chars-aleatoria>`
   - `GEMINI_API_KEY`: `<sua-gemini-api-key>`
   - `RESEND_API_KEY`: `re_<sua-chave-resend>`
   *(Clique em **Encrypt** nas variáveis sensíveis de banco e segredos)*.

5. **Salvar e Implantar:**
   - Clique em **Save and Deploy**.
   - A Cloudflare baixará as dependências com pnpm, compilará o frontend Vite em `dist/`, detectará automaticamente o diretório `functions/` e compilará o worker de API.

---

### Método B: Deploy Manual via Wrangler CLI

Se preferir realizar o deploy diretamente do terminal local com o Wrangler:

1. **Autenticar na Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Executar Build de Produção:**
   ```bash
   pnpm build
   ```

3. **Efetuar o Deploy:**
   ```bash
   npx wrangler pages deploy dist --project-name dinheirizz --branch main
   ```

4. **Cadastrar Segredos via CLI (uma única vez):**
   ```bash
   npx wrangler pages secret put DATABASE_URL --project-name dinheirizz
   npx wrangler pages secret put SUPABASE_JWT_SECRET --project-name dinheirizz
   npx wrangler pages secret put AI_ENCRYPTION_KEY --project-name dinheirizz
   npx wrangler pages secret put GEMINI_API_KEY --project-name dinheirizz
   npx wrangler pages secret put RESEND_API_KEY --project-name dinheirizz
   ```

---

## 5. Configurações Especiais do `wrangler.toml`

O arquivo `wrangler.toml` na raiz do projeto já contém os parâmetros fundamentais para o correto funcionamento da API Hono:

```toml
name = "dinheirizz"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

[vars]
ENVIRONMENT = "production"
```

> [!IMPORTANT]
> A flag `compatibility_flags = ["nodejs_compat"]` é **obrigatória**. Ela permite que os módulos de banco de dados (`postgres`, `crypto`, `buffer`) funcionem no runtime V8 dos Cloudflare Workers sem erros de ausência de Node APIs.

---

## 6. Guia de Troubleshooting & Diagnóstico

### 6.1. Erro de Conexão com o Banco de Dados (`DATABASE_URL`)
- **Sintoma:** Rotas de `/api/v1/*` retornam `500 Erro interno no servidor` ou timeout de conexão.
- **Causa:** O Supabase pode bloquear conexões IPv4 diretas em alguns planos ou estourar o limite de conexões em edge workers.
- **Solução:**
  - Utilize sempre o **Connection Pooler** do Supabase no modo `Transaction` ou `Session` (porta `6543`), por exemplo:
    `postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
  - Se estiver usando o pooler em modo Transaction, evite comandos de `LISTEN`/`NOTIFY`. O Hono e o Drizzle client em `api/src/db/client.ts` já estão configurados com `{ max: 1 }` para conexões leves por invocação de worker.

### 6.2. Erro de Autenticação (`401 Não autorizado`) nas Rotas Protegidas
- **Sintoma:** O frontend loga pelo Supabase Auth, mas as requisições para `/api/v1/accounts`, `/api/v1/transactions`, etc., retornam `Token de autenticação inválido ou expirado`.
- **Causa:** O `SUPABASE_JWT_SECRET` configurado na Cloudflare não coincide com o secret do projeto no Supabase.
- **Solução:**
  - Acesse o Supabase Dashboard > **Project Settings** > **API**.
  - Localize o campo **JWT Secret**.
  - Atualize a variável `SUPABASE_JWT_SECRET` no painel da Cloudflare Pages e dispare um novo deploy.

### 6.3. Falha no Build do Cloudflare (`Node version incompatible` ou `pnpm command not found`)
- **Sintoma:** O log de build falha com erro de sintaxe TypeScript ou suporte do Vite.
- **Solução:**
  - Adicione a variável de ambiente `NODE_VERSION` com o valor `20.18.0` nas variáveis de build do Cloudflare Pages.

### 6.4. Roteamento SPA e Páginas Recarregadas (404 Not Found)
- **Sintoma:** Ao navegar pela aplicação tudo funciona, mas ao pressionar F5 em `/dashboard` ou `/transactions`, o Cloudflare retorna 404.
- **Solução:** O Cloudflare Pages SPA mode serve `index.html` automaticamente para rotas não mapeadas em arquivos estáticos quando configurado como Pages. Se necessário, crie um arquivo `public/_routes.json` ou `public/_redirects` com:
  ```text
  /* /index.html 200
  ```
  *(O Vite Plugin PWA e o Pages padrão já tratam isso nativamente).*

### 6.5. Falha no Envio de E-mails Transacionais
- **Sintoma:** Usuários não recebem e-mails de confirmação ou recuperação.
- **Solução:**
  - Verifique se a variável `RESEND_API_KEY` está preenchida com uma chave válida do [resend.com](https://resend.com).
  - Certifique-se de que o domínio configurado em `EMAIL_FROM` está verificado no painel do Resend. Se ainda estiver em testes, utilize `onboarding@resend.dev` e envie apenas para o e-mail cadastrado na conta do Resend.

---

## 7. Checklist Final Pré-Deploy

- [x] Migrações Drizzle geradas e sem pendências no schema (`pnpm db:generate` limpo).
- [x] Migração `0006_luxuriant_gressill.sql` aplicada no banco com sucesso.
- [x] Histórico de migrações sincronizado na tabela `drizzle.__drizzle_migrations`.
- [x] Build de produção testado e aprovado com sucesso (`pnpm build`).
- [x] Suíte de testes automatizados 100% verde (73 arquivos, 440 testes aprovados).
- [x] `wrangler.toml` configurado com `pages_build_output_dir = "dist"` e `nodejs_compat`.
- [x] Relação completa de variáveis de ambiente mapeadas para o Cloudflare Dashboard.
