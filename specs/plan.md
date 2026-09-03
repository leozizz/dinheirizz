# plan.md
# Plano de Implementação — [TÍTULO DA ISSUE]

> Gerado pelo agente após aprovação da `spec.md`.
> **Aguardando aprovação antes de qualquer escrita de código.**
> Arquivo local — não commitado (ver `specs/.gitignore`).

---

## Resumo do entendimento

<!-- O agente descreve em 3–5 linhas o que entendeu da spec e das issues.
     Se algo ficou ambíguo, registrar aqui antes de continuar. -->

---

## Dúvidas e ambiguidades

<!-- Lista de questões que precisam de resposta antes de começar.
     Se não houver: "Nenhuma — spec e codebase cobrem todos os casos." -->

---

## Sequência de implementação

> Os passos seguem a ordem Red → Green → Refactor quando há testes envolvidos.
> Passo de teste vem antes do passo de implementação correspondente.

### Passo 1 — [título]

**O que faz:**
**Arquivos criados/alterados:**
**Teste:** `[caminho do arquivo de teste]` — [Vitest unitário / integração / Playwright E2E / nenhum + justificativa]

### Passo 2 — [título]

**O que faz:**
**Arquivos criados/alterados:**
**Teste:**

<!-- continuar conforme necessário -->

---

## Arquivos criados

```
<!-- lista com caminho completo -->
```

## Arquivos alterados

```
<!-- lista com caminho completo e descrição da mudança -->
```

## Arquivos removidos

```
<!-- lista ou "Nenhum" -->
```

---

## Superfície de regressão

> Testes existentes que tocam arquivos desta issue.
> Todos devem continuar passando após a implementação.
> Verificar ao final de cada passo, não apenas no fim.

| Arquivo de teste | O que testa | Risco de quebra |
|------------------|-------------|-----------------|
| `<!-- caminho -->` | `<!-- comportamento -->` | Alto / Médio / Baixo |

> Se não houver testes existentes nos arquivos em escopo:
> "Nenhuma cobertura existente — risco de regressão silenciosa. Considerar criar testes base."

---

## Critérios de aceite × passos

| Critério (da spec, seção 8) | Atendido no Passo |
|-----------------------------|------------------|
| ...                         | Passo N           |

---

## O que está fora deste plano

<!-- Itens da spec que não serão implementados agora e por quê. -->
