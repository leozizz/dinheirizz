# 🛠️ Troubleshooting — Esteira Paperclip AI (Dinheirizz)

> Guia de diagnóstico rápido para falhas operacionais no Windows, Paperclip Server, GitHub Sync, Playwright MCP e `agent-standards`.

---

## 1. Caracteres Corrompidos (*Mojibake* / Interrogações `?`) em Comentários ou Scripts
**Sintoma:** Comentários no Paperclip ou saídas de terminal Windows exibem `aÃ§Ã£o` ou `prioriza??o`.  
**Causa:** Terminal Windows PowerShell usando CodePage 437/850 ou `Invoke-RestMethod` enviando payload sem header UTF-8 explícito.  
**Solução:**
1. No terminal antes de rodar scripts: `chcp 65001`.
2. Sempre utilize `pnpm task:handoff` (`scripts/paperclip-task.mjs`), que faz `fetch` nativo em UTF-8 sem passar strings acentuadas por `curl.exe`.
3. Em scripts PowerShell chamando a API do Paperclip, converta o JSON com `[System.Text.Encoding]::UTF8.GetBytes($json)` e `-ContentType "application/json; charset=utf-8"`.

---

## 2. Agente Não Acorda Após Reatribuição (`--assign`)
**Sintoma:** A task foi reatribuída (`assigneeAgentId` atualizado), mas o agente permanece `idle` sem iniciar execução.  
**Diagnóstico:**
1. Verifique se o agente não está `paused` (ex.: o legado `Dinheirizz | Fullstack` foi pausado propositalmente):
   ```powershell
   Invoke-RestMethod http://127.0.0.1:3100/api/companies/7cc4de9e-1eb0-44ea-8d5b-43d3d0d91655/agents |
     Where-Object { $_.name -like 'Dinheirizz*' } |
     Select-Object name, status, @{n='wakeOnAssign';e={$_.runtimeConfig.heartbeat.wakeOnAssignment}}
   ```
2. Garanta que `runtimeConfig.heartbeat.wakeOnAssignment` e `wakeOnDemand` estão `true`.
3. Caso algum dos novos agentes (`Backend`, `Frontend`, `UX Reviewer`) apareça como `paused`, reative via `POST http://127.0.0.1:3100/api/agents/{id}/resume`.

---

## 3. Erro `P0` em `pnpm sync:*` ou `gh auth token` Inválido
**Sintoma:** `pnpm sync:status` ou `pnpm sync:dispatch` falha ao consultar o GitHub ou o Paperclip (`ECONNREFUSED 127.0.0.1:3100`).  
**Solução:**
- Confirme se o servidor local do Paperclip está ativo na porta `3100` (`Invoke-RestMethod http://127.0.0.1:3100/api/health` ou listagem de empresas).
- Valide autenticação do GitHub CLI: `gh auth status`. Se expirado, execute `gh auth login`.
- Verifique se o ambiente de execução não bloqueou loopback/rede (sandbox). Scripts que acessam `127.0.0.1:3100` ou GitHub precisam de acesso à rede local/externa.

---

## 4. Erro ao Executar `pnpm task:handoff` Sem `PAPERCLIP_TASK_ID`
**Sintoma:** `Error: PAPERCLIP_TASK_ID not set` ao rodar `pnpm task:handoff` manualmente fora de um run do Paperclip.  
**Solução:** Passe explicitamente `--issue <UUID_OU_IDENTIFIER>` (ex.: `--issue DIN-42`) junto com `--assign <persona>`.

---

## 5. UX Reviewer / QA Não Consegue Rodar Playwright MCP
**Sintoma:** Browser headless não inicia ou `localhost` não responde para o Playwright.  
**Solução:**
1. Confirme o MCP global em `C:\Users\leona\.gemini\config\mcp_config.json` (`playwright` registrado).
2. Inicie o servidor local do Dinheirizz (`pnpm dev` para `/api/*` via Hono dev plugin ou `pnpm build && pnpm preview`) **no mesmo processo/sessão** ou fora do sandbox isolado para que o browser consiga conectar na URL local (`http://127.0.0.1:5173`).
3. Para inspeção rápida via CLI: verifique `playwright-cli` nas skills locais (`.skills/playwright-cli`).

---

## 6. Divergências Reportadas por `pnpm standards:review`
**Sintoma:** O comando `pnpm standards:review` falha ou gera `REVIEW_REPORT.md` com violações.  
**Principais causas no Dinheirizz:**
- Uso de `function MinhaFunc()` em vez de `const MinhaFunc = () => {}`;
- Uso de `: any` / `as any` (trocar por interface ou `unknown` + narrowing);
- Uso de `!important` no CSS (`src/index.css` ou componentes);
- `console.log` esquecido fora de `scripts/`;
- Import de módulos `node:*` (`fs`, `path`, `crypto`) dentro de `src/` (browser SPA — usar Web APIs como `crypto.subtle`).

Após corrigir, execute novamente `pnpm standards:review` e confirme status **Aprovado**.
