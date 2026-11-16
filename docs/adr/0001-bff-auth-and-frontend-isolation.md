# 1. Isolamento Rigoroso do Frontend e Autenticação BFF-Driven

Date: 2026-11-13

## Status
Aceito e Implementado

## Contexto
O Dinheirizz 2.0 utiliza React 19 no Frontend e Hono 4 / Cloudflare Pages Functions no Backend.
Anteriormente, o Frontend possuía uma dependência direta da biblioteca `@supabase/supabase-js` para autenticação OAuth e gerenciamento de sessão, o que expunha fallbacks de chaves públicas no bundle do cliente e violava o princípio de Clean Architecture, onde o Frontend deve se comunicar estritamente com o BFF da aplicação.

## Decisão
1. **Remoção Total do Supabase no Frontend:**
   - O arquivo `src/lib/supabase.ts` foi removido.
   - O Frontend não importa nenhuma biblioteca externa de banco de dados ou autenticação. Todas as interações ocorrem via endpoints REST `/api/v1/...`.
2. **Autenticação BFF-Driven:**
   - O fluxo de login social OAuth (Google e Apple) foi centralizado no Backend Hono (`GET /api/v1/auth/oauth/:provider` para obter a URL de autorização e `POST /api/v1/auth/oauth/session` para validação server-to-server e emissão do JWT próprio da aplicação).
   - Sessões locais são persistidas via Web Crypto API no `encryptedStorageAdapter` e validadas contra o endpoint seguro `/api/v1/auth/me`.
3. **Segurança de JWT em Produção:**
   - O middleware de autenticação (`api/src/middlewares/auth.ts`) bloqueia qualquer fallback de desenvolvimento quando em produção (`NODE_ENV === 'production'`), exigindo chaves criptográficas fortes (`JWT_SECRET` ou `SUPABASE_JWT_SECRET`).
4. **Indexação Estratégica no PostgreSQL / Drizzle:**
   - Índices relacionais e compostos foram implementados nas tabelas de alto volume (`transactions`, `budgets`, `accounts`, `categories`, `pix_keys`, `insights`, `verification_tokens`), prevenindo Full Table Scans.
5. **Integração Contínua (CI):**
   - Pipeline GitHub Actions configurado em `.github/workflows/ci.yml` cobrindo lint de padrões (`pnpm standards:review`), 100% dos testes unitários/integração (`pnpm test`) e build de produção PWA (`pnpm build`).

## Consequências
- Bundle inicial reduzido em mais de 200 kB.
- Frontend 100% puro, testável com mocks HTTP padrão e agnóstico de fornecedor de banco.
- Governança automatizada e garantida a cada Pull Request na branch principal.
