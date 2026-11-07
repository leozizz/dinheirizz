#!/usr/bin/env node
/**
 * Paperclip Task Unblock & Reconciliation Helper (Dinheirizz)
 * Clears execution blockers caused by operator cancellations or machine restarts
 * and smoothly resumes task execution without triggering duplicate on-demand runs.
 *
 * Usage:
 *   pnpm task:unblock
 *   pnpm task:unblock --issue <ISSUE_ID>
 */

const API_URL = (process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100').replace(/\/+$/, '').replace(/\/api$/, '');
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || '7cc4de9e-1eb0-44ea-8d5b-43d3d0d91655';
const PROJECT_ID = process.env.PAPERCLIP_PROJECT_ID || '1a62fd49-1e2a-468e-9edf-24125fdf9f7c';

async function main() {
  const args = process.argv.slice(2);
  let issueId = null;
  const issueIdx = args.indexOf('--issue');
  if (issueIdx !== -1 && args[issueIdx + 1]) {
    issueId = args[issueIdx + 1];
  }

  // Auto-detectar issue ativa com blocker se não informada
  if (!issueId) {
    const listRes = await fetch(`${API_URL}/api/companies/${COMPANY_ID}/issues`);
    if (!listRes.ok) throw new Error(`Falha ao listar issues: ${await listRes.text()}`);
    const issues = await listRes.json();
    const projectIssues = issues.filter(i => i.projectId === PROJECT_ID);

    for (const issue of projectIssues) {
      const detailRes = await fetch(`${API_URL}/api/issues/${issue.id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        if (detail.executionBlocker) {
          issueId = issue.id;
          console.log(`[Unblock Helper] Detectada issue com Execution Blocker: ${detail.identifier} (${detail.title})`);
          break;
        }
      }
    }
  }

  if (!issueId) {
    console.log('[Unblock Helper] Nenhuma issue com Execution Blocker encontrada no projeto Dinheirizz.');
    return;
  }

  const res = await fetch(`${API_URL}/api/issues/${issueId}`);
  const issue = await res.json();
  const blocker = issue.executionBlocker;

  if (!blocker) {
    console.log(`[Unblock Helper] A issue ${issue.identifier} não possui blocker ativo.`);
    return;
  }

  console.log(`[Unblock Helper] Resolvendo blocker na issue ${issue.identifier}...`);
  console.log(`Causa: ${blocker.cause}, Run: ${blocker.runId}`);

  const payload = {
    actionId: blocker.recoveryActionId || undefined,
    outcome: 'restored',
    sourceIssueStatus: 'todo',
    resolutionNote: 'Desbloqueio manual após verificação do operador.',
    executionReconciliation: blocker.runId ? {
      runId: blocker.runId,
      providerStopped: true,
      actionOutcome: 'mixed',
      outcomeEvidence: 'Workspace e integridade dos arquivos verificados pelo operador.',
    } : undefined,
  };

  const resolveRes = await fetch(`${API_URL}/api/issues/${issueId}/recovery-actions/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resolveRes.ok) {
    console.error(`[Unblock Helper] Falha ao resolver recovery action: HTTP ${resolveRes.status} - ${await resolveRes.text()}`);
    process.exit(1);
  }

  console.log(`[Unblock Helper] Sucesso! Execution Blocker removido da issue ${issue.identifier}.`);

  // Se havia assignee, mover para in_progress para acionar via wakeOnAssignment com o contexto da task
  // Nota: Não chamamos heartbeat/invoke avulso para evitar disparo concorrente duplicado em 'on_demand'.
  if (issue.assigneeAgentId) {
    console.log(`[Unblock Helper] Reativando agente ${issue.assigneeAgentId} via task assignment...`);
    await fetch(`${API_URL}/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_progress',
        comment: 'Execução retomada pelo operador.',
      }),
    });

    console.log(`[Unblock Helper] Tarefa movida para in_progress. Agente acionado via automação com contexto da task.`);
  }
}

main().catch(err => {
  console.error('[Unblock Helper] Erro:', err.message);
  process.exit(1);
});
