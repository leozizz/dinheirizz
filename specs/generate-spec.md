# generate-spec.md
# Geração da Spec por Issue — executar no início de cada task

> Substitua `#000` pelo número real da issue antes de executar.
> O agente preencherá apenas o bloco ISSUE CONTEXT da `spec.md`.
> O bloco PROJECT CONTEXT (preenchido pelo `setup.md`) não deve ser alterado.

---

## Instruções para o Agente

Você irá preencher a seção **ISSUE CONTEXT** de `specs/spec.md` com base
na issue indicada abaixo e no contexto do repositório.

**Não altere** o bloco PROJECT CONTEXT da spec.md.

---

## Passo 1 — Leitura de documentação e contexto

```
specs/spec.md          ← ler o PROJECT CONTEXT para entender a stack
specs/testing.md       ← ler as convenções de teste antes de preencher a seção 7
.agents/AGENTS.md      ← regras e decisões do projeto (se existir)
```

---

## Passo 2 — Leitura da issue e issues relacionadas via MCP

```
Issue principal: #2
Issue relacionada: #1
```

Para cada issue lida:
- Ler o corpo completo
- Identificar issues referenciadas (épico, dependências, bloqueadas)
- Ler essas issues também
- Para cada uma com PR atrelado: ler o diff completo

---

## Passo 3 — Leitura do codebase relevante

Com base na issue, identificar e ler via MCP os arquivos que serão impactados.

Ao ler cada arquivo, anotar mentalmente:
- Qual é a estrutura atual
- Quais tipos e interfaces são usados
- Quais nomes de funções, componentes e endpoints existem
- O que pode quebrar se for alterado

Não inventar nomes que não foram vistos no código.

---

## Passo 4 — Levantamento de cobertura de testes existente

> Este passo alimenta a seção 7 (Estratégia de Testes) da spec.

Para cada arquivo identificado no Passo 3, verificar:

```bash
# Buscar testes existentes relacionados aos arquivos em escopo
# ex: procurar por *.spec.ts, *.test.ts, *.e2e.ts que importam ou testam
#     os arquivos que serão alterados
```

Ao preencher a spec, listar na seção "Cobertura existente afetada" (seção 7)
qualquer teste encontrado que possa ser impactado pela mudança.

Se não houver testes existentes nos arquivos em escopo, registrar explicitamente:
`"Nenhum teste existente nos arquivos em escopo."` — não deixar em branco.

---

## Passo 5 — Preenchimento da spec.md

Preencher todos os `<!-- FILL -->` dentro do bloco ISSUE CONTEXT da `spec.md`:

- **Seção 1:** dados de identificação da issue
- **Seção 2:** contexto em 2–4 linhas, referenciando a issue (não duplicando)
- **Seção 3:** issues adicionais a ler e arquivos do repositório identificados no Passo 3
- **Seção 4:** escopo extraído da issue — o que está dentro e fora
- **Seção 5:** contratos de API/banco/schema conforme a issue define
- **Seção 6:** lista de arquivos a criar, alterar ou remover
- **Seção 7:** estratégia de testes seguindo TDD (Red/Green/Refactor) com base em `testing.md`
- **Seção 8:** critérios de aceite extraídos da issue, com correspondência aos testes

**Regras ao preencher:**
- Não inventar informações ausentes na issue ou no código
- Se algo não estiver claro: deixar o placeholder e listar na seção de pendências abaixo
- Usar os nomes reais de arquivos, funções e tipos encontrados no repositório

---

## Passo 6 — Relatório de pendências

Ao finalizar, listar no chat (não na spec):

1. **Preenchido automaticamente:** o que foi extraído da issue e do código
2. **Requer revisão humana:** campos com informação ambígua ou incompleta
3. **Não encontrado:** o que estava ausente na issue e no código

Aguardar revisão e aprovação da spec antes de qualquer implementação.