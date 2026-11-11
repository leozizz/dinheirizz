# 🧭 Guia do Operador — Esteira Autônoma Dinheirizz (GitHub ➔ Paperclip)

> **Público-alvo:** Operador Humano / Tech Lead  
> **Fonte Única da Verdade:** GitHub Issues (`leozizz/dinheirizz`)  
> **Orquestrador:** Paperclip AI (`http://127.0.0.1:3100`)  

---

## 1. Visão Geral da Operação

A esteira do **Dinheirizz** opera de forma orientada a backlog (**GitHub Issues ➔ Paperclip**), consumindo **zero tokens de IA** durante a sincronização e fechamento de tarefas via `scripts/paperclip-sync.mjs`:

1. O operador prioriza as demandas no **GitHub Issues / Projects** (`leozizz/dinheirizz`).
2. `pnpm sync:board` espelha as issues abertas no Paperclip sem disparar agentes ainda.
3. `pnpm sync:dispatch` seleciona a próxima issue elegível (`todo` sem assignee ativo) e a atribui ao **`Dinheirizz | PM`**, despertando o ciclo autônomo de 7 etapas.
4. Ao final do ciclo, o **`Dinheirizz | DevOps`** fecha o PR em `main` e roda `pnpm sync:close <GH_NUMBER> --pr <PR_NUMBER> --dispatch-next`, encerrando a issue no GitHub e engatando automaticamente a próxima demanda.

---

## 2. Comandos Essenciais do Operador

Execute sempre no diretório raiz (`C:\Code\Leozizz\dinheirizz`) com codificação UTF-8 (`chcp 65001` no Windows):

```powershell
# 1. Consultar estado sincronizado entre GitHub e Paperclip (zero custo de IA)
pnpm sync:status

# 2. Importar novas issues abertas do GitHub para o board do Paperclip
pnpm sync:board

# 3. Disparar a próxima issue priorizada para o PM iniciar o SDD
pnpm sync:dispatch

# 4. Fechar manualmente a issue atual após merge e puxar a próxima
pnpm sync:close <GH_NUMBER> --pr <PR_NUMBER> --dispatch-next
```

### Comandos Utilizados Pelos Agentes (Handoff & Desbloqueio)

```powershell
# Passar bastão entre os 7 agentes (usa PAPERCLIP_TASK_ID ou --issue)
pnpm task:handoff --assign tech-lead --comment "Spec SDD finalizada"
pnpm task:handoff --assign backend --comment "Plano TDD aprovado (API/DB)"
pnpm task:handoff --assign frontend --comment "Contratos prontos, iniciar UI"
pnpm task:handoff --assign ux-reviewer --comment "PR aberto para gate Anti-Slop"
pnpm task:handoff --assign qa --comment "UX aprovado no Playwright, validar E2E"
pnpm task:handoff --assign tech-lead --comment "QA aprovado, revisar PR final"
pnpm task:handoff --assign devops --comment "PR aprovado, executar merge e deploy"

# Desbloquear ou intervir manualmente em uma task travada
pnpm task:unblock
```

Aliases aceitos em `--assign`: `pm`, `tech-lead`, `backend` (`be`), `frontend` (`fe`), `ux-reviewer` (`ux`), `qa`, `devops`.

---

## 3. Auditoria de Qualidade & Governança

```powershell
# Sincronizar arquivos de padrões (STANDARDS.md, CLAUDE.md, .cursorrules)
pnpm standards:sync

# Rodar auditoria mecânica de código (arrow functions, zero any, sem !important, sem console.log)
pnpm standards:review

# Rodar suíte Vitest + Build de produção
pnpm test
pnpm build
```

> ⚠️ **Atenção:** Sempre que `agent.config.json` ou `.agents/AGENTS.md` forem atualizados, replique `AGENTS.md` e `STANDARDS.md` para as 7 subpastas isoladas (`.agents/pm/`, `.agents/tech-lead/`, `.agents/backend/`, `.agents/frontend/`, `.agents/ux-reviewer/`, `.agents/qa/`, `.agents/devops/`).

---

## 4. Documentos Relacionados
- [docs/paperclip-agents.md](./paperclip-agents.md) — Topologia dos 7 agentes, UUIDs reais, skills e Playwright MCP.
- [docs/paperclip-troubleshooting.md](./paperclip-troubleshooting.md) — Diagnóstico de falhas comuns (mojibake, agente pausado, sync, Playwright).
- [docs/deployment-cloudflare.md](./deployment-cloudflare.md) — Pipeline Cloudflare Pages & Pages Functions.
