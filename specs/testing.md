# testing.md
# Convenções de Teste do Projeto

> Preenchido pelo `setup.md` uma vez por projeto.
> Consultado pelo agente em toda issue que envolva testes.
> Atualizar quando as convenções mudarem — não por issue.

---

## 1. Pirâmide de Testes do Projeto

> Define a proporção e o foco de cada camada de teste.
> Preencher com a realidade do projeto, não com o ideal teórico.

```
UNITÁRIOS (base — maior volume)
  O que cobre: funções utilitárias, validações Zod, cálculos financeiros,
               regras de negócio isoladas, custom hooks do React, transformações.
  O que não cobre: rotas HTTP completas, banco de dados real.

INTEGRAÇÃO (meio)
  O que cobre: endpoints e middlewares do BFF HonoJS (com Drizzle mockado),
               componentes React com interação do usuário (Testing Library).
  O que não cobre: chamadas destrutivas a banco de produção/nuvem.

E2E (topo — fluxos críticos futuros)
  O que cobre: fluxos críticos de autenticação, cadastro e conciliação financeira.
  O que não cobre: fluxos de edge case cobertos em testes unitários.
```

---

## 2. Frameworks e Ferramentas

```
Unitários:        Vitest
Integração:       Vitest + @testing-library/react + Hono test client
E2E:              Playwright (fases posteriores)
Mocks / Stubs:    vi.fn(), vi.mock, vi.spyOn (Drizzle ORM mocks)
Fixtures:         Factories TypeScript em tests/fixtures/
Coverage:         v8 (Vitest coverage-v8)
```

---

## 3. Localização dos Testes

```
Unitários/Integração BFF:     api/tests/*.spec.ts
Unitários/Integração Frontend: src/tests/*.spec.tsx, src/**/__tests__/*.spec.ts
E2E:                          tests/e2e/*.e2e.ts
Fixtures / Setup Mocks:       api/tests/setup.ts, src/tests/setup.ts
```

---

## 4. Nomenclatura

### Arquivos
```
Unitário/Integração:   [nome-do-arquivo].spec.ts / [NomeDoComponente].spec.tsx
E2E:                   [fluxo].e2e.ts
```

### Describes e Its
```typescript
describe('[NomeDoEndpoint / Service / Componente]', () => {
  describe('[cenário ou condição]', () => {
    it('deve [comportamento esperado]', async () => {
      // ...
    })
  })
})
```

---

## 5. Comandos

```bash
# Rodar todos os testes:
pnpm test

# Rodar em watch mode:
pnpm test:watch

# Rodar apenas testes do BFF (Hono):
pnpm test api

# Rodar apenas testes do Frontend:
pnpm test src

# Rodar com cobertura:
pnpm test:coverage
```

---

## 6. Critérios de Quando Testar

### Sempre testar (unitário obrigatório)
```
- Validações de payload e formulários com schemas Zod
- Handlers e regras de rotas do BFF Hono
- Funções de formatação e cálculo monetário/datas
- Custom hooks com gerenciamento de estado
```

### Sempre testar (integração obrigatória)
```
- Contratos de rotas HTTP do Hono (/api/*) simulando requisições com mocks do Drizzle
- Renderização inicial de componentes visuais fundamentais e modais
```

### Não testar (evitar)
```
- Código gerado automaticamente (database.types.ts do Supabase)
- Estilos CSS puros sem interatividade lógica
- Libs externas de terceiros diretamente
```

---

## 7. Padrões de Mock

### Dados externos (API, banco)
```
- Mock estrito do Drizzle ORM: Todas as queries Drizzle devem ser interceptadas via mocks em api/tests/setup.ts.
- NUNCA executar queries reais no Supabase Cloud durante suítes de testes automatizados.
```

### Módulos internos
```
- vi.mock para isolamento de camadas ou serviços externos (ex: APIs de IA, e-mail).
- Injeção de dependência e clients instanciados via handlers.
```

### Fixtures e factories
```typescript
// Exemplo de factory para transação:
export const makeTransactionFixture = (overrides = {}) => ({
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  user_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  account_id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  category_id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  amount: '150.00',
  description: 'Almoço Executivo',
  occurred_at: '2026-09-02T12:00:00Z',
  paid: true,
  created_at: '2026-09-02T12:00:00Z',
  ...overrides,
})
```

---

## 8. Cobertura

```
Meta de cobertura:    >= 70% de cobertura nos endpoints do BFF e regras de validação
Excluir da cobertura: *.d.ts, dist/, node_modules/, vite.config.ts, wrangler.toml
Relatório gerado em:  coverage/
```

---

## 9. CI — Testes Automatizados

```
Pull Requests:
  - Vitest (unitários e integração BFF com mocks) obrigatório e bloqueante.
  - Typecheck (pnpm typecheck) obrigatório.

Merge para branch principal:
  - Validação completa de testes e build de produção (Vite + Cloudflare Pages).
```