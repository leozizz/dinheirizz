#!/usr/bin/env node
/**
 * Paperclip <-> GitHub Issues Autonomous Sync Bridge (Dinheirizz)
 * Keeps GitHub Issues as the single source of truth, synchronizes them
 * with the Paperclip board, and dispatches the next prioritized issue
 * to the Product Manager autonomously upon demand completion.
 *
 * Zero AI Token Overhead - runs via GitHub API / gh CLI and Paperclip REST API.
 *
 * Usage:
 *   node scripts/paperclip-sync.mjs --status
 *   node scripts/paperclip-sync.mjs --sync
 *   node scripts/paperclip-sync.mjs --dispatch-next
 *   node scripts/paperclip-sync.mjs --close-current 35 --pr 36 --dispatch-next
 */

import { execSync } from 'node:child_process';

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'leozizz/dinheirizz';
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || '7cc4de9e-1eb0-44ea-8d5b-43d3d0d91655';
const PROJECT_ID = process.env.PAPERCLIP_PROJECT_ID || '1a62fd49-1e2a-468e-9edf-24125fdf9f7c';
const API_URL = (process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100').replace(/\/+$/, '').replace(/\/api$/, '');
const PM_AGENT_ID = 'f7accc8b-e406-443c-b9c4-2c1845509723';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const token = execSync('gh auth token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (token) return token;
  } catch {
    // gh CLI not authenticated
  }
  return null;
}

const GH_TOKEN = getGitHubToken();

async function getGitHubIssues() {
  // Tentativa 1: GitHub REST API via fetch
  if (GH_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=50`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GH_TOKEN}`,
          'User-Agent': 'dinheirizz-paperclip-bridge',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const issues = await res.json();
        return issues.filter(i => !i.pull_request);
      }
    } catch {
      // Fallback para gh CLI
    }
  }

  // Tentativa 2: gh CLI
  try {
    const output = execSync(`gh issue list --repo ${GITHUB_REPO} --state open --limit 50 --json number,title,body,createdAt`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (output) {
      const parsed = JSON.parse(output);
      return parsed.map(item => ({
        number: item.number,
        title: item.title,
        body: item.body,
        created_at: item.createdAt,
      }));
    }
  } catch {
    // Falha em ambos
  }

  return [];
}

async function getPaperclipIssues() {
  try {
    const res = await fetch(`${API_URL}/api/companies/${COMPANY_ID}/issues`);
    if (!res.ok) {
      throw new Error(`Paperclip API HTTP ${res.status}: ${await res.text()}`);
    }
    const all = await res.json();
    return all.filter(i => i.projectId === PROJECT_ID);
  } catch (err) {
    console.error('[Sync Bridge] Erro ao buscar tarefas do Paperclip:', err.message);
    return [];
  }
}

async function createPaperclipIssue(ghIssue) {
  const title = `[GH-#${ghIssue.number}] ${ghIssue.title}`;
  const description = [
    `# Demanda Originada do GitHub Issue #${ghIssue.number}`,
    ``,
    `**Título Original:** ${ghIssue.title}`,
    `**Data de Criação:** ${ghIssue.created_at}`,
    `**Origem da Verdade:** [GitHub Issue #${ghIssue.number}](https://github.com/${GITHUB_REPO}/issues/${ghIssue.number})`,
    ``,
    `---`,
    `## Especificação Inicial da Demanda`,
    ``,
    ghIssue.body || 'Sem descrição fornecida no GitHub.',
    ``,
    `---`,
    `> **Instrução ao Fluxo SDD Autônomo:**`,
    `> 1. **PM:** crie a especificação SDD em \`specs/spec.${ghIssue.number}.md\` e reatribua a task para o **Tech Lead** (\`pnpm task:handoff --assign tech-lead\`).`,
    `> 2. **Tech Lead:** aprove a spec, crie o plano TDD em \`specs/plan.${ghIssue.number}.md\` e reatribua para o **Fullstack** (\`pnpm task:handoff --assign fullstack\`).`,
    `> 3. **Fullstack:** crie a branch \`feat/${ghIssue.number}-...\`, implemente o código seguindo TDD, passe nos testes unitários e de integração, comite, abra PR e reatribua para o **QA** (\`pnpm task:handoff --assign qa\`).`,
    `> 4. **QA:** execute testes Playwright E2E e valide rigorosamente a integridade de UI/UX (responsividade mobile/desktop, ausência de quebras visuais e contraste). Se aprovado, reatribua para o **DevOps** (\`pnpm task:handoff --assign devops\`).`,
    `> 5. **DevOps:** homologue o build de produção, faça o merge do PR na branch \`main\` e execute \`node scripts/paperclip-sync.mjs --close-current ${ghIssue.number} --pr <PR_NUMBER> --dispatch-next\` para engatar a próxima issue.`
  ].join('\n');

  const payload = {
    projectId: PROJECT_ID,
    title,
    description,
    status: 'todo',
    priority: 'medium',
  };

  const res = await fetch(`${API_URL}/api/companies/${COMPANY_ID}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar tarefa no Paperclip: ${await res.text()}`);
  }

  const created = await res.json();
  console.log(`[Sync Bridge] Criada task no Paperclip: ${created.identifier} para GitHub #${ghIssue.number}`);
  return created;
}

async function updatePaperclipIssue(issueId, payload) {
  const res = await fetch(`${API_URL}/api/issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Falha ao atualizar tarefa ${issueId}: ${await res.text()}`);
  }

  return await res.json();
}

async function syncIssues() {
  console.log('[Sync Bridge] Sincronizando GitHub Issues -> Paperclip...');
  const ghIssues = await getGitHubIssues();
  const pcIssues = await getPaperclipIssues();

  console.log(`[Sync Bridge] Encontradas ${ghIssues.length} issues abertas no GitHub.`);
  
  ghIssues.sort((a, b) => a.number - b.number);

  const synced = [];
  for (const gh of ghIssues) {
    const existing = pcIssues.find(p => 
      p.title.includes(`[GH-#${gh.number}]`) || 
      p.title.includes(`Issue #${gh.number}`) ||
      p.title.includes(`#${gh.number}:`) ||
      p.title.includes(`(#${gh.number})`)
    );

    if (!existing) {
      console.log(`[Sync Bridge] Nova issue detectada no GitHub: #${gh.number} - "${gh.title}"`);
      const created = await createPaperclipIssue(gh);
      synced.push(created);
    } else {
      synced.push(existing);
    }
  }

  return { ghIssues, pcIssues, synced };
}

async function dispatchNext() {
  console.log('[Sync Bridge] Verificando fila de execução e disponibilidade dos agentes...');
  const pcIssues = await getPaperclipIssues();

  const activeIssue = pcIssues.find(i => i.status === 'in_progress');
  if (activeIssue) {
    console.log(`[Sync Bridge] Já existe uma tarefa em andamento no Paperclip: ${activeIssue.identifier} (${activeIssue.title}). Nenhum novo disparo necessário.`);
    return activeIssue;
  }

  const todoIssues = pcIssues.filter(i => i.status === 'todo');
  if (todoIssues.length === 0) {
    console.log('[Sync Bridge] Nenhuma tarefa com status "todo" encontrada no Paperclip.');
    return null;
  }

  todoIssues.sort((a, b) => (a.issueNumber || 0) - (b.issueNumber || 0));
  const nextIssue = todoIssues[0];

  console.log(`[Sync Bridge] Disparando próxima demanda: ${nextIssue.identifier} - "${nextIssue.title}" para o Product Manager.`);

  const updated = await updatePaperclipIssue(nextIssue.id, {
    status: 'in_progress',
    assigneeAgentId: PM_AGENT_ID,
    comment: 'Demanda priorizada automaticamente pelo GitHub Sync Bridge. Iniciando Fase 1: Especificação SDD (specs/spec.{ID}.md).'
  });

  console.log(`[Sync Bridge] Sucesso! Product Manager acionado via wakeOnAssignment para ${nextIssue.identifier}.`);
  return updated;
}

async function closeCurrent(ghNumber, prNumber) {
  console.log(`[Sync Bridge] Fechando GitHub Issue #${ghNumber}...`);
  const comment = prNumber
    ? `Demanda concluída, testada e homologada via PR #${prNumber} na branch \`main\`.`
    : `Demanda concluída e homologada na branch \`main\`.`;

  // 1. Fechar issue no GitHub via REST ou gh CLI
  let closedOnGh = false;
  if (GH_TOKEN) {
    try {
      await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${ghNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'dinheirizz-paperclip-bridge',
        },
        body: JSON.stringify({ body: comment }),
        signal: AbortSignal.timeout(5000),
      });

      const closeRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${ghNumber}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'dinheirizz-paperclip-bridge',
        },
        body: JSON.stringify({ state: 'closed' }),
        signal: AbortSignal.timeout(5000),
      });

      if (closeRes.ok) {
        console.log(`[Sync Bridge] GitHub Issue #${ghNumber} fechada com sucesso via REST API.`);
        closedOnGh = true;
      }
    } catch {
      // Tentar gh CLI
    }
  }

  if (!closedOnGh) {
    try {
      execSync(`gh issue close ${ghNumber} --comment "${comment}" --repo ${GITHUB_REPO}`, { stdio: 'inherit' });
      console.log(`[Sync Bridge] GitHub Issue #${ghNumber} fechada com sucesso via gh CLI.`);
    } catch (err) {
      console.warn(`[Sync Bridge] Aviso ao fechar via gh CLI:`, err.message);
    }
  }

  // 2. Localizar tarefa correspondente no Paperclip e marcar como done
  const pcIssues = await getPaperclipIssues();
  const matching = pcIssues.find(p => 
    p.title.includes(`[GH-#${ghNumber}]`) || 
    p.title.includes(`Issue #${ghNumber}`) ||
    p.title.includes(`#${ghNumber}:`) ||
    p.title.includes(`(#${ghNumber})`)
  );

  if (matching) {
    console.log(`[Sync Bridge] Atualizando tarefa ${matching.identifier} para status "done" no Paperclip...`);
    await updatePaperclipIssue(matching.id, {
      status: 'done',
      comment: `Entrega homologada em produção. ${comment}`,
    });
    console.log(`[Sync Bridge] Tarefa ${matching.identifier} concluída com sucesso no Paperclip.`);
  } else {
    console.log(`[Sync Bridge] Nenhuma tarefa aberta correspondente à Issue #${ghNumber} encontrada no Paperclip.`);
  }
}

async function printStatus() {
  console.log('\n================ GITHUB ISSUES (Abertas) ================');
  const ghIssues = await getGitHubIssues();
  if (ghIssues.length === 0) {
    console.log('(Nenhuma issue aberta encontrada no GitHub ou sem conexão de rede)');
  } else {
    for (const gh of ghIssues) {
      console.log(`- #${gh.number}: ${gh.title} (${gh.created_at})`);
    }
  }

  console.log('\n================ PAPERCLIP TASKS (Dinheirizz) ================');
  const pcIssues = await getPaperclipIssues();
  if (pcIssues.length === 0) {
    console.log('(Nenhuma tarefa cadastrada no Paperclip para o projeto Dinheirizz)');
  } else {
    for (const pc of pcIssues) {
      console.log(`- [${pc.identifier}] [${pc.status.toUpperCase()}] ${pc.title} (Assignee: ${pc.assigneeAgentId || 'Nenhum'})`);
    }
  }
  console.log('=========================================================\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status') || args.length === 0) {
    await printStatus();
  }

  if (args.includes('--sync')) {
    await syncIssues();
    await printStatus();
  }

  if (args.includes('--close-current')) {
    const idx = args.indexOf('--close-current');
    const ghNumber = args[idx + 1];
    let prNumber = null;
    const prIdx = args.indexOf('--pr');
    if (prIdx !== -1 && args[prIdx + 1]) {
      prNumber = args[prIdx + 1];
    }

    if (!ghNumber || isNaN(Number(ghNumber))) {
      console.error('[Sync Bridge] Erro: Informe o número da issue do GitHub a fechar. Ex: --close-current 35 --pr 36');
      process.exit(1);
    }

    await closeCurrent(ghNumber, prNumber);
  }

  if (args.includes('--dispatch-next')) {
    await dispatchNext();
  }
}

main().catch(err => {
  console.error('[Sync Bridge] Falha inesperada:', err);
  process.exit(1);
});
