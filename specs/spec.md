# spec.md
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
Linguagem:      TypeScript 5
Build:          Vite
Estilização:    Tailwind CSS + Vanilla CSS Tokens (Glassmorphism)
Componentes:    Radix UI / shadcn/ui + Design System Próprio
Roteamento:     React Router / SPA Routing
Estado:         React Context / Hooks
```

### Backend
```
Framework:      Hono.js (/api)
Runtime:        Cloudflare Pages / Workers (Edge)
Linguagem:      TypeScript 5
Autenticação:   Supabase Auth
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
│   ├── hooks/      # Custom React hooks
│   ├── lib/        # Utilitários e instâncias de clientes
│   ├── types/      # Tipagens TypeScript e database.types.ts
│   └── tests/      # Testes unitários do frontend
├── specs/          # Especificações (spec.md, testing.md, design-system.md)
└── public/         # Assets estáticos, manifest PWA, ícones
```

---

## PC-4. Convenções do Projeto

```
Nomenclatura de branches:  feat/, fix/, chore/, refactor/
Padrão de commits:         Conventional Commits (feat:, fix:, chore:, refactor:, test:)
Localização de testes:     api/tests/*.spec.ts, src/tests/*.spec.tsx
Variáveis de ambiente:     .env, .env.local, .env.example
Documentação interna:      specs/design-system.md, specs/testing.md, copilot-instructions.md
```

---

## PC-5. Restrições Permanentes do Projeto

```
- Sem `any` em TypeScript — strict mode obrigatório
- Manter fidelidade visual estrita a specs/design-system.md (OKLCH, Glassmorphism, temas)
- Proibido executar queries destrutivas ou migrações reais em nuvem durante testes automatizados (Drizzle deve ser mockado)
- Backend BFF alocado exclusivamente no diretório /api utilizando HonoJS
- Gerenciamento de pacotes estritamente com pnpm
- Sem console.log em código de produção
```

## PC-6. MCPs Disponíveis

- MCP GitHub - Utilize-o como prioridade ao invés do Github CLI.

<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->

---
---

<!-- ═══ ISSUE CONTEXT — preenchido pelo generate-spec.md por issue ═══ -->

## 1. Identificação

```
Issue principal:    #<!-- FILL -->
Título:             <!-- FILL -->
Tipo:               <!-- FILL: feat | fix | refactor | chore | spike -->
Branch:             <!-- FILL: ex: feat/fe-07-cadastro-equipe -->
Milestone:          <!-- FILL ou remover -->
```

**Issues relacionadas**
```
<!-- FILL: listar com número e título resumido
ex:
#1  Épico
#2  Roadmap
#BE-06  Employees + 5 roles (depende de)
#FE-08  Calendário (bloqueia)
-->
```

---

## 2. Contexto

> O que esta spec cobre e por que existe.
> Referenciar a issue — não duplicar o conteúdo dela.

<!-- FILL: 2–4 linhas -->

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
# Caminhos definidos em PC-4 — não repetir aqui, apenas confirmar que foram lidos.
# Adicionar arquivos específicos desta issue se houver:
<!-- FILL ou remover -->
```

### 3.2 Issues via MCP
```
<!-- FILL: listar as issues a ler além das já indicadas na seção 1 -->
```

Ler PRs atrelados a cada issue. Para PRs mergeados, ler o diff completo.

### 3.3 Arquivos do repositório
```
<!-- FILL: listar arquivos/pastas a ler antes de editar
ex:
src/pages/cadastros/
src/types/employee.ts
src/context/AuthContext.tsx
-->
```

---

## 4. Escopo

### Está incluso
```
<!-- FILL -->
-
-
```

### Está fora do escopo
```
<!-- FILL -->
-
-
```

---

## 5. Contratos

> Preencher apenas o que esta issue cria, altera ou consome.
> Adaptar ao tipo de interface do projeto (REST, GraphQL, RPC, eventos…).

### Endpoints / Mutations / Queries
```
<!-- FILL: ex:
GET  /api/employees?role=MONITOR
POST /api/employees
# ou para GraphQL:
# mutation CreateEmployee($input: EmployeeInput!): Employee
-->
```

### Schema / Migrations
```sql
-- FILL: alterações de banco necessárias
-- ex:
-- ALTER TABLE employees ADD COLUMN IF NOT EXISTS nome_en VARCHAR(255);
```

### Tipos gerados (se aplicável)
```bash
# FILL: comando para regenerar tipos após mudança de schema
# ex: prisma generate | supabase gen types | graphql-codegen
```

---

## 6. Arquivos que Serão Criados ou Alterados

> O agente **não deve alterar** arquivos fora desta lista sem justificar
> com comentário `// SPEC-#<número>: <motivo>`.

```
CRIAR:
  <!-- FILL -->

ALTERAR:
  <!-- FILL -->

REMOVER (se aplicável):
  <!-- FILL ou remover esta linha -->
```

---

## 7. Estratégia de Testes (TDD)

> Preencher antes de qualquer implementação.
> Consultar `specs/testing.md` para convenções do projeto.

### 🔴 Red — testes que devem falhar primeiro

> Descrever os testes que serão escritos ANTES da implementação.
> Cada critério de aceite deve ter ao menos um teste correspondente.

```
<!-- FILL: ex:
- `employee.service.spec.ts` → deve lançar erro ao criar employee com role ADM por COORDENACAO
- `EmployeeForm.spec.tsx` → deve desabilitar opção ADM no select para usuário COORDENACAO
- `cadastros.e2e.ts` → fluxo completo de cadastro de monitor com nome_en obrigatório
-->
```

### 🟢 Green — mínimo para os testes passarem

> O que precisa ser implementado para que cada teste acima passe.
> Sem over-engineering — apenas o suficiente.

```
<!-- FILL: ex:
- Validação de role no service antes de persistir
- Lógica de filtragem de opções no componente de select
- Handler do formulário com campo nome_en condicional
-->
```

### 🔵 Refactor — oportunidades após o green

> O que pode ser melhorado depois que os testes passam,
> sem quebrar nenhum deles.

```
<!-- FILL ou "Nenhuma oportunidade identificada nesta iteração." -->
```

### Cobertura existente afetada

> Testes já existentes que tocam arquivos desta issue.
> Verificar que continuam passando após a implementação.

```
<!-- FILL: ex:
- `auth.spec.ts` → testa login — afetado se AuthContext for alterado
- Remover se não houver testes existentes nos arquivos em escopo
-->
```

---

## 8. Critérios de Aceite

> Copiar e adaptar da issue. Cada item deve ter correspondência na seção 7 (testes).

```
<!-- FILL:
- [ ] ...
- [ ] ...
-->
```

<!-- ═══ FIM DO ISSUE CONTEXT ═══ -->
