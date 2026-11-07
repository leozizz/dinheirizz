# Diretrizes de Engenharia e Padrões de Código (Universal Agent)

> Padrões Técnicos e de Qualidade de Código do Projeto Dinheirizz

## 1. Padrões de Funções e Sintaxe
- ❌ **NUNCA** usar `function` tradicional em arquivos de lógica/componentes.
- ✅ **SEMPRE** utilizar arrow functions (`const fn = () => {}`).

## 2. Tipagem TypeScript
- ❌ **PROIBIDO** o uso de `any` em qualquer circunstância.
- ✅ Tipar explicitamente parâmetros e retornos; usar `unknown` para valores indeterminados.
- ✅ Preferir `interface` para objetos e contratos de dados complexos.
- ✅ Parâmetros e retornos de funções devem possuir tipagem estrita explícita.

## 3. Componentes e Estilo de UI
- ✅ Biblioteca / Design System: **Tailwind CSS + Radix UI + Design Tokens**.
- ✅ **OBRIGATÓRIO**: Todos os botões, campos de entrada e seletores interativos devem conter `data-testid`.
- ❌ **PROIBIDO** o uso de `!important` no CSS. Respeite a especificidade e os tokens de design.
- 🎨 **Temas Oficiais**: Escuro (Dark) e Claro Clean (Light).
- 📱 **Responsividade & UI/UX Gate**: Proibido overflow horizontal (`scrollWidth <= innerWidth`) em resoluções mobile (375px/390px), tablet (768px) e desktop (1280px+). Elementos não podem se sobrepor ou quebrar quebras de linha em viewports reduzidos.

## 4. Segurança e Higiene de Código
- ❌ **XSS Proibido**: Nunca utilizar `innerHTML` sem sanitização.
- ❌ **Credenciais Proibidas**: Nunca commitar API keys, senhas ou tokens hardcoded.
- 🔐 **Criptografia & Dados**: Uso de APIs seguras e sanitização rigorosa de inputs.
- ❌ Remover `console.log` e chamadas de depuração residuais antes de finalizar.
- ❌ Proibido blocos `catch` vazios sem tratamento ou logging estruturado.

## 5. Arquitetura, SDD e Resiliência
- 📋 **Spec-Driven Development (SDD)**: Nenhuma alteração de código sem spec/plano correspondente aprovado.
- 🔄 **GitHub Backlog & Sync**: GitHub Issues/Kanban é a fonte da verdade. O fechamento e despacho contínuo de tarefas é orquestrado via `pnpm sync:*`.

## 6. Fluxo de Trabalho e Code Review
- Toda entrega deve atender estritamente aos requisitos da tarefa/issue e aos padrões deste documento.
- Validação contínua com `pnpm test` e `pnpm build`.
