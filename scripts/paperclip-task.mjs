#!/usr/bin/env node
/**
 * Paperclip Task Helper for Dinheirizz (Windows / Cross-Platform)
 * Reassigns or updates Paperclip issues cleanly without shell quoting or curl mojibake.
 *
 * Usage:
 *   node scripts/paperclip-task.mjs --assign tech-lead --comment "Spec pronta para auditoria"
 *   node scripts/paperclip-task.mjs --assign fullstack --comment "Aprovado, iniciar desenvolvimento"
 *   node scripts/paperclip-task.mjs --assign qa --comment "PR aberto para testes"
 *   node scripts/paperclip-task.mjs --status done --comment "Deploy homologado"
 */

const AGENT_MAP = {
  'pm': 'f7accc8b-e406-443c-b9c4-2c1845509723',
  'product-manager': 'f7accc8b-e406-443c-b9c4-2c1845509723',
  'tech-lead': '0e5af8f2-3ff8-4863-93ec-1989b4d2738d',
  'fullstack': '5eb7f7ed-446e-4d40-9af7-59d6936e69f6',
  'fullstack-developer': '5eb7f7ed-446e-4d40-9af7-59d6936e69f6',
  'qa': '2a962652-06f4-4420-83ff-2d2a647d6804',
  'qa-engineer': '2a962652-06f4-4420-83ff-2d2a647d6804',
  'devops': '2f8fe03a-6b86-43dc-9744-18c4a82cd4b6',
  'devops-engineer': '2f8fe03a-6b86-43dc-9744-18c4a82cd4b6',
};

async function main() {
  const args = process.argv.slice(2);
  let targetAssignee = null;
  let status = null;
  let comment = null;
  let issueId = process.env.PAPERCLIP_TASK_ID || null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--assign' || arg === '-a') {
      targetAssignee = args[++i];
    } else if (arg === '--status' || arg === '-s') {
      status = args[++i];
    } else if (arg === '--comment' || arg === '-m') {
      comment = args[++i];
    } else if (arg === '--issue' || arg === '-i') {
      issueId = args[++i];
    }
  }

  const apiUrl = (process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100').replace(/\/+$/, '').replace(/\/api$/, '');
  const apiKey = process.env.PAPERCLIP_API_KEY;
  const companyId = process.env.PAPERCLIP_COMPANY_ID || '7cc4de9e-1eb0-44ea-8d5b-43d3d0d91655';
  const projectId = process.env.PAPERCLIP_PROJECT_ID || '1a62fd49-1e2a-468e-9edf-24125fdf9f7c';
  const runId = process.env.PAPERCLIP_RUN_ID;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (runId) {
    headers['X-Paperclip-Run-Id'] = runId;
  }

  // Auto-detect issueId if not provided
  if (!issueId) {
    try {
      const res = await fetch(`${apiUrl}/api/companies/${companyId}/issues`, { headers });
      if (res.ok) {
        const issues = await res.json();
        // Filtrar tarefas pertencentes ao projeto Dinheirizz
        const projectIssues = issues.filter(i => i.projectId === projectId || !i.projectId);
        const active = projectIssues.find(i => i.status === 'in_progress' || i.status === 'todo' || i.status === 'blocked');
        if (active) {
          issueId = active.id;
          console.log(`[Paperclip Helper] Tarefa ativa detectada automaticamente: ${active.identifier} (${active.title})`);
        }
      }
    } catch (e) {
      // Continue to validation
    }
  }

  if (!issueId) {
    console.error('[Paperclip Helper] Erro: Nenhum ID de tarefa encontrado no ambiente ou nos argumentos.');
    process.exit(1);
  }

  const payload = {};
  if (targetAssignee) {
    const resolvedId = AGENT_MAP[targetAssignee.toLowerCase()] || targetAssignee;
    payload.assigneeAgentId = resolvedId;
  }
  if (status) {
    payload.status = status;
  }
  if (comment) {
    payload.comment = comment;
  }

  if (Object.keys(payload).length === 0) {
    console.error('[Paperclip Helper] Erro: Nenhuma alteração solicitada. Forneça --assign, --status ou --comment.');
    process.exit(1);
  }

  console.log(`[Paperclip Helper] Atualizando tarefa ${issueId}:`, JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${apiUrl}/api/issues/${issueId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Paperclip Helper] Falha na API: HTTP ${res.status}:`, errText);
      process.exit(1);
    }

    const updated = await res.json();
    console.log(`[Paperclip Helper] Sucesso! Tarefa ${updated.identifier} atualizada. Status: ${updated.status}, Responsável: ${updated.assigneeAgentId}`);
  } catch (err) {
    console.error('[Paperclip Helper] Erro de conexão:', err.message);
    process.exit(1);
  }
}

main();
