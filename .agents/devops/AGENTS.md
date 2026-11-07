# 📜 AGENTS.md — Regras Globais & Constituição do Time Dinheirizz

> **Documento Mestre Compartilhado**  
> **Status:** Ativo e Mandatório para Todos os Agentes Paperclip AI  
> **Aplica-se a:** Tech Lead, PM, Fullstack Developer, QA Engineer, DevOps Engineer  

---

## 1. Missão do Projeto
O **Dinheirizz** é uma plataforma de gestão financeira pessoal e empresarial moderna, de alta performance, segura e responsiva, desenvolvida com React 19, TypeScript estrito, Vite, Tailwind CSS, Radix UI / shadcn, Supabase (PostgreSQL), Drizzle ORM e deploy automatizado no Cloudflare Pages.

Nenhum agente está autorizado a violar os princípios de segurança, performance, estabilidade e arquitetura descritos neste documento.

---

## 2. Topologia do Repositório
```
dinheirizz/
├── src/                    # Frontend React 19 + TypeScript + Vite + Tailwind CSS
│   ├── components/         # Componentes UI reutilizáveis (Radix UI / shadcn)
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Utilitários, clientes de dados e criptografia
│   ├── pages/              # Páginas e views da aplicação
│   ├── services/           # Camada de serviços e integração Supabase
│   ├── styles/             # Tokens de design e CSS global
│   └── types/              # Tipagens TypeScript e Database Types
├── drizzle/                # Schemas relacionais e migrações do Drizzle ORM
├── public/                 # Assets públicos estáticos e PWA manifest
├── scripts/                # Scripts de automação, migração de DB e Paperclip bridge
├── specs/                  # Especificações SDD (spec.*.md, plan.*.md, testing.md)
├── docs/                   # Documentação arquitetural, UI/UX e guias operacionais
└── .agents/                # Instruções e isolamento dos agentes especializados
```

---

## 3. Regras de Ouro Inegociáveis (Non-Negotiables)

1. **Spec-Driven Development (SDD) Obrigatório:**
   - Nenhuma linha de código de feature ou refatoração estrutural é escrita sem uma `specs/spec.{ID}.md` aprovada pelo Tech Lead.
   - Nenhum código é alterado sem antes ter um `specs/plan.{ID}.md` descrevendo os passos Red → Green → Refactor.
   - Os arquivos `specs/spec.md` e `specs/plan.md` na raiz são templates e **nunca** devem ser alterados ou sobrescritos.

2. **Tipagem e Sintaxe Estrita:**
   - ❌ **PROIBIDO** o uso de `any` em qualquer circunstância.
   - ✅ Parâmetros e retornos de funções devem possuir tipagem estrita explícita.
   - ✅ **SEMPRE** utilizar arrow functions (`const fn = () => {}`) em componentes e funções de lógica. Nunca use `function` tradicional.

3. **Design System & Estilização:**
   - 🎨 Dois temas oficiais: **Escuro (Dark)** e **Claro (Light Clean)**.
   - ❌ **PROIBIDO** o uso de `!important` no CSS. Todas as regras de sobreposição devem respeitar a especificidade e os tokens de design.
   - ✅ **OBRIGATÓRIO**: Todos os botões, campos de entrada e seletores interativos devem conter `data-testid` para testes automatizados.

4. **Auditoria e Gate de Qualidade UI/UX & Responsividade Mobile/Desktop:**
   - É mandatório que toda entrega com interface visual atenda rigorosamente aos testes de layout responsivo.
   - **Sem Overflow Horizontal:** `document.documentElement.scrollWidth <= window.innerWidth` em viewports mobile (375px/390px), tablet (768px) e desktop (1280px+).
   - **Sem Quebras ou Elementos Sobrepostos:** Botões, inputs, cards e dropdowns não podem colidir ou ter problemas de `z-index`.
   - **Acessibilidade:** WCAG 2.1 AA (contraste mínimo de 4.5:1, touch target mínimo de 44x44px e atributos `aria-label`).

5. **Segurança e Higiene de Código:**
   - ❌ **XSS Proibido**: Nunca utilizar `innerHTML` sem sanitização.
   - ❌ **Credenciais Proibidas**: Nunca commitar API keys, senhas ou tokens hardcoded.
   - ❌ Remover `console.log` e chamadas de depuração residuais antes de abrir PR.
   - ❌ Proibido blocos `catch` vazios sem tratamento ou logging estruturado.

6. **Git, Branching e Pull Requests:**
   - ❌ **PROIBIDO** fazer commits ou merges diretos na branch `main`.
   - ✅ Toda alteração deve ser desenvolvida em branch isolada: `feat/{id}-{slug}` ou `fix/{id}-{slug}`.
   - Pull Requests devem conter título semântico, descrição clara em UTF-8 limpo e passar por validação de QA e aprovação do Tech Lead.

7. **Codificação Estrita UTF-8 em Comentários, Issues e Respostas:**
   - Todas as mensagens, comentários de issues no Paperclip, logs e documentações **devem** ser emitidas em **UTF-8 nativo** com caracteres da língua portuguesa acentuados corretamente (ex: `ação`, `priorização`, `médio`).
   - É terminantemente proibido enviar saídas com caracteres corrompidos (*mojibake* ou interrogações).
   - Scripts e comandos no ambiente Windows devem assegurar `chcp 65001`.

8. **GitHub como Fonte Única da Verdade & Orquestração Contínua de Pipeline:**
   - O **GitHub Issues / Kanban** (`leozizz/dinheirizz`) é a fonte oficial e primária de verdade para todo o tracking de negócio, roadmap e priorização de backlog.
   - O **Paperclip AI** atua como engine operacional de execução das tarefas do time.
   - O script `dinheirizz/scripts/paperclip-sync.mjs` (`pnpm sync:*`) sincroniza as tarefas do GitHub para o Paperclip sem consumo de tokens de IA.
   - Ao concluir o deploy e merge do PR, o DevOps executa `pnpm sync:close <GH_NUMBER> --pr <PR_NUMBER> --dispatch-next`, fechando a issue formalmente no GitHub, marcando a tarefa como concluída no Paperclip e acionando o PM para a próxima issue do backlog.
