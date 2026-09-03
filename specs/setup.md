# setup.md
# Configuração Inicial do Projeto — executar UMA VEZ por projeto

> Este arquivo é o ponto de entrada do Spec Driven Development.
> Execute-o no início do projeto para configurar os arquivos base da pasta `/specs`.
> Após a execução, commite os arquivos gerados. Não execute novamente a menos que
> a stack ou as convenções do projeto mudem de forma significativa.

---

## Instruções para o Agente

Você irá configurar dois arquivos permanentes da pasta `/specs`:
- `specs/spec.md` — preencher a seção **PROJECT CONTEXT** com os dados do projeto
- `specs/testing.md` — preencher com as convenções de teste do projeto

**Não altere** as seções de issue (`ISSUE CONTEXT`) da `spec.md` — elas são preenchidas
por issue via `generate-spec.md`.

---

## Passo 1 — Leitura do repositório

Leia os seguintes recursos antes de preencher qualquer arquivo:

```
# Documentação interna (se existir — adaptar caminhos ao projeto)
.agents/AGENTS.md
README.md
docs/
src/docs/

# Estrutura de pastas
/  (raiz do repositório — listar dois níveis de profundidade)
src/
```

Se algum caminho não existir, ignorar e seguir.

---

## Passo 2 — Perguntas a responder via leitura do repositório

Antes de escrever, o agente deve ser capaz de responder:

**Stack**
- Qual linguagem principal? (TypeScript, Python, Go, Java…)
- Qual framework de frontend? (React, Vue, Next.js, Svelte…)
- Qual framework de backend? (Express, Hono, NestJS, FastAPI, Spring…)
- Qual banco de dados? (PostgreSQL, MySQL, MongoDB, SQLite…)
- Qual ORM ou query builder? (Prisma, Drizzle, TypeORM, SQLAlchemy…)
- Qual provedor de autenticação? (JWT próprio, Supabase Auth, Auth.js, Clerk…)
- Qual ferramenta de build? (Vite, webpack, esbuild, Turbopack…)
- Qual runtime? (Node.js, Bun, Deno, JVM…)

**Testes**
- Qual framework de testes unitários? (Vitest, Jest, pytest, JUnit…)
- Qual framework de testes E2E? (Playwright, Cypress, Selenium…)
- Os testes ficam em `__tests__/`, `*.spec.ts`, `*.test.ts` ou outro padrão?
- Existe script de teste no `package.json` / `Makefile` / equivalente?

**CLIs disponíveis**
- Quais CLIs o projeto usa? (`gh`, `supabase`, `prisma`, `docker`, `make`…)
- Existe script de migration? Como rodar?
- Como gerar tipos a partir do schema?

**Convenções**
- Padrão de nomenclatura de branches? (`feat/`, `fix/`, `chore/`…)
- Padrão de commits? (Conventional Commits, outro…)
- Onde ficam os componentes? Pages? Services? Utils?
- Existe um design system ou biblioteca de componentes?

Se alguma informação não for encontrada no repositório, deixar o placeholder
`<!-- NÃO ENCONTRADO — preencher manualmente -->` no campo correspondente.

---

## Passo 3 — Preencher `specs/spec.md`

Preencher **somente** os campos dentro do bloco delimitado por:

```
<!-- ═══ PROJECT CONTEXT — preenchido pelo setup.md ═══ -->
...
<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->
```

Não tocar em nada fora desse bloco.

---

## Passo 4 — Preencher `specs/testing.md`

Preencher o arquivo `specs/testing.md` completo com base no que foi encontrado
no repositório. Ver estrutura detalhada dentro do próprio `testing.md`.

---

## Passo 5 — Relatório de conclusão

Ao finalizar, listar:
1. O que foi preenchido automaticamente (com fonte — ex: "encontrado no package.json")
2. O que ficou com placeholder (requer preenchimento manual)
3. Inconsistências encontradas (ex: dois frameworks de teste configurados)