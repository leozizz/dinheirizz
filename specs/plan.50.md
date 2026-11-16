# plan.50.md
# Plano de Implementação TDD — feat(ui): Implementação do Tema Claro Oficial (Light Clean) e Persistência de Dual-Theme (#50)

> **Gerado pelo:** Dinheirizz | Tech Lead (Arquiteto Chefe & Gatekeeper de Qualidade)  
> **Status:** Aprovado para Execução pelo Frontend Developer  
> **Referência:** `specs/spec.50.md` | Issue #50 (GitHub) / LEO-56 (Paperclip)  
> **Alvo:** Frontend SPA/PWA (`src/`)  

---

## 1. Resumo do Entendimento

A Issue #50 define a concretização do **Dual-Theme Oficial** do Dinheirizz 2.0, atendendo à Regra de Ouro nº 3 da Constituição (`AGENTS.md`):
1. **Tokens Semânticos OKLCH do Tema Claro (`.light`)**: Calibração cromática de alto padrão em `src/index.css` sob a classe `.light`, assegurando estética *Light Clean* (gelo ardósia anti-glare, contraste mínimo WCAG 2.1 AA de 4.5:1, sombras suaves sem artefatos escuros opressivos e zero uso de `!important`).
2. **Arquitetura de Estado e Reatividade (`ThemeContext` + `useTheme`)**:
   - Criação de `src/types/theme.ts` e `src/contexts/ThemeContext.tsx` com suporte aos modos `dark`, `light` e `system`.
   - Detecção dinâmica do sistema operacional através de `window.matchMedia('(prefers-color-scheme: dark)')` quando no modo `system`.
   - Persistência assíncrona segura no navegador com `encryptedStorageAdapter` (WebCrypto AES-GCM) sob a chave `dinheirizz:theme_mode`.
   - Prevenção ativa contra *Flash of Unstyled Content* (FOUC) com inicialização síncrona/imediata com fallback para `dark`.
   - Sincronização automática no DOM: aplicação da classe `.light` ou `.dark` e do atributo `data-theme` no `<html>`, além da atualização da meta tag `<meta name="theme-color">` (`#0d0e12` para dark e `#f8fafc` para light).
3. **Controles de UI e Acessibilidade (Apple HIG / WCAG AA)**:
   - Toggle rápido no Header principal (`src/App.tsx`) com `data-testid="header-theme-toggle-btn"` e touch target mínimo de 44x44px.
   - Toggle rápido no cabeçalho da Landing Page (`src/components/landing/LandingHeader.tsx`) com `data-testid="landing-theme-toggle-btn"`.
   - Seletor segmentado de 3 opções (Dark, Light, Sistema) no Modal de Perfil (`src/components/modals/ProfileModal.tsx`) com `data-testid="theme-selector-group"` e `data-testid="theme-option-{dark,light,system}"`.
   - Sincronização reativa de notificações `Toaster` (Sonner) recebendo `theme={resolvedTheme}` em vez do hardcoded `theme="dark"`.
4. **Design System & Documentação**: Atualização de `specs/design-system.md` formalizando a paleta OKLCH do tema claro e os critérios de contraste.

---

## 2. Dúvidas e Ambiguidades

- **Escopo 100% Frontend**: Nenhuma dúvida. A persistência de tema é uma preferência de dispositivo gerenciada pelo cliente via `encryptedStorageAdapter`, não necessitando de novas migrações Drizzle nem rotas Hono na API.
- **Transição de Tema**: A transição deve ser fluida e elegante (`transition: background-color 0.2s ease, color 0.2s ease`), sem causar reflows bruscos ou quebra de contraste em gráficos.

---

## 3. Sequência de Implementação (TDD: Red → Green → Refactor)

> Os passos seguem a ordem rigorosa Red → Green → Refactor.
> Todo código deve utilizar Arrow Functions, tipagem estrita (zero `any`), atributos `data-testid` obrigatórios e conformidade visual com o Design System.

---

### Passo 1 — Tipagem e Suíte de Testes Unitários de Tema (TDD)

**O que faz:**
- **🔴 Red:** Criar `src/tests/Theme.spec.tsx` cobrindo:
  1. Inicialização padrão como `dark` quando não houver preferência persistida;
  2. Carregamento de preferência `light` previamente gravada no `encryptedStorageAdapter`;
  3. Comutação de tema via `setTheme('light')` com injeção da classe `.light` e remoção de `.dark` em `document.documentElement`;
  4. Atualização de `data-theme` e meta tag `theme-color` no `<head>`;
  5. Resolução dinâmica de `system` baseada em mock de `window.matchMedia` (modo claro e escuro do SO);
  6. Comutação via `toggleTheme()` alternando ciclicamente entre `dark` e `light`.
- **🟢 Green:**
  - Criar `src/types/theme.ts` definindo os tipos `ThemeMode` (`'dark' | 'light' | 'system'`), `ResolvedTheme` (`'dark' | 'light'`) e a interface `ThemeContextType`.
  - Criar `src/contexts/ThemeContext.tsx` implementando o `ThemeProvider` com reatividade, listener de `matchMedia`, sincronização com o DOM e persistência em `encryptedStorageAdapter`.
  - Criar `src/hooks/useTheme.ts` exportando o hook consumidor `useTheme()` com validação contra uso fora do provider.
- **🔵 Refactor:** Assegurar que falhas eventuais no WebCrypto durante testes ou SSR degradem com tolerância a falhas sem travar a renderização.

**Arquivos criados/alterados:**
- CRIAR: `src/types/theme.ts`
- CRIAR: `src/contexts/ThemeContext.tsx`
- CRIAR: `src/hooks/useTheme.ts`
- CRIAR: `src/tests/Theme.spec.tsx`
**Teste:** `src/tests/Theme.spec.tsx` (Vitest unitário).

---

### Passo 2 — Tokens Semânticos OKLCH do Tema Claro em `src/index.css`

**O que faz:**
- **🔴 Red:** Expandir `src/tests/Theme.spec.tsx` para verificar que a classe `.light` é adicionada ao elemento raiz e que as classes de estilo glassmorphism operam harmoniosamente.
- **🟢 Green:**
  - Adicionar o bloco `.light` sob `@layer base` em `src/index.css` com os tokens OKLCH calibrados pela especificação:
    - `--background`: `oklch(0.985 0.002 260)`
    - `--card`: `oklch(1 0 0 / 0.80)`
    - `--card-foreground`: `oklch(0.18 0.015 260)`
    - `--popover`: `oklch(1 0 0 / 0.96)`
    - `--popover-foreground`: `oklch(0.18 0.015 260)`
    - `--sidebar`: `oklch(0.975 0.004 260 / 0.90)`
    - `--sidebar-foreground`: `oklch(0.18 0.015 260)`
    - `--input`: `oklch(0.95 0.005 260 / 0.80)`
    - `--foreground`: `oklch(0.15 0.015 260)`
    - `--muted`: `oklch(0.93 0.006 260 / 0.70)`
    - `--muted-foreground`: `oklch(0.42 0.015 260)` (contraste >= 4.8:1)
    - `--secondary`: `oklch(0.935 0.006 260 / 0.75)`
    - `--secondary-foreground`: `oklch(0.20 0.015 260)`
    - `--primary`: `oklch(0.55 0.17 142)` (esmeralda fintech escurecido para contraste >= 4.6:1 no fundo claro)
    - `--primary-foreground`: `oklch(0.98 0 0)`
    - `--accent`: `oklch(0.48 0.14 195)`
    - `--accent-foreground`: `oklch(0.98 0 0)`
    - `--destructive`: `oklch(0.58 0.22 25)`
    - `--destructive-foreground`: `oklch(0.98 0 0)`
    - `--success`: `oklch(0.52 0.17 142)`
    - `--success-foreground`: `oklch(0.98 0 0)`
    - `--border`: `oklch(0.85 0.008 260 / 0.60)`
    - `--ring`: `oklch(0.55 0.17 142 / 0.40)`
  - Adicionar variantes específicas para o tema claro nas classes Glassmorphism:
    - `.light .glass-card` e `.light .glass-card-interactive`: sombras suaves (`rgba(0, 0, 0, 0.06)`), sem blocos pretos profundos.
    - `.light .glass-card-interactive:hover`: elevação sutil e reflexo vítreo leve.
    - `.light .gradient-orb-primary` e `.light .gradient-orb-accent`: opacidade em 0.03 para iluminação difusa delicada.
- **🔵 Refactor:** Garantir estritamente a ausência de `!important` e validação de contraste cromático.

**Arquivos criados/alterados:**
- ALTERAR: `src/index.css`
**Teste:** Validação de renderização CSS e suite Vitest.

---

### Passo 3 — Envolvimento Global com `ThemeProvider` e Toggle no Header Principal (`src/App.tsx`)

**O que faz:**
- **🔴 Red:** Adicionar testes de renderização e clique no botão de alternância do Header em `src/tests/Theme.spec.tsx` (`data-testid="header-theme-toggle-btn"`).
- **🟢 Green:**
  - Envolver a aplicação com `<ThemeProvider>` em `src/App.tsx` (dentro de `AuthProvider`).
  - Consumir `useTheme()` em `MainApp`.
  - Inserir botão de alternância rápida de tema no Header (ao lado de Notificações / Perfil) com:
    - `data-testid="header-theme-toggle-btn"`
    - `aria-label="Alternar tema visual"`
    - Ícones dinâmicos `Sun` (quando tema atual for dark) e `Moon` (quando tema atual for light)
    - Hitbox mínima garantida de 44x44px
    - Chamada ao método `toggleTheme()`
  - Atualizar o componente `<Toaster>` no rodapé de `src/App.tsx` para passar `theme={resolvedTheme}` dinamicamente.
- **🔵 Refactor:** Ajustar transições de classes no header e tooltips acessíveis.

**Arquivos criados/alterados:**
- ALTERAR: `src/App.tsx`
**Teste:** `src/tests/Theme.spec.tsx` e `src/tests/App.spec.tsx`.

---

### Passo 4 — Toggle de Tema na Landing Page e Suporte Dinâmico no Sonner

**O que faz:**
- **🔴 Red:** Adicionar teste verificando a presença do botão `data-testid="landing-theme-toggle-btn"` em `LandingHeader`.
- **🟢 Green:**
  - Atualizar `src/components/landing/LandingHeader.tsx` incluindo o botão de alternância rápida de tema ao lado do botão "Entrar", com `data-testid="landing-theme-toggle-btn"` e touch target >= 44x44px.
  - Atualizar `src/components/ui/sonner.tsx` para aceitar `theme` opcional ou consumir `useTheme()`, abandonando o hardcoded `theme="dark"`.
  - Atualizar `src/components/auth/LoginScreen.tsx` caso haja referências a instâncias de Toaster locais.
- **🔵 Refactor:** Homogeneizar o estilo do botão de tema entre a Landing Page e o App.

**Arquivos criados/alterados:**
- ALTERAR: `src/components/landing/LandingHeader.tsx`
- ALTERAR: `src/components/ui/sonner.tsx`
**Teste:** Vitest cobrindo `LandingHeader` e `sonner`.

---

### Passo 5 — Seletor Segmentado de Aparência no Modal de Perfil (`ProfileModal.tsx`)

**O que faz:**
- **🔴 Red:** Criar teste em `src/tests/Theme.spec.tsx` montando `ProfileModal` e verificando:
  1. Renderização da seção "Aparência & Tema";
  2. Presença do grupo `data-testid="theme-selector-group"`;
  3. Presença dos botões `data-testid="theme-option-dark"`, `data-testid="theme-option-light"` e `data-testid="theme-option-system"`;
  4. Mudança de estado ativo ao clicar nas opções.
- **🟢 Green:**
  - Importar `useTheme` em `src/components/modals/ProfileModal.tsx`.
  - Criar a seção visual "Aparência & Tema" com os três modos em um controle segmentado moderno:
    - Escuro (`Dark Luxury`): ícone `Moon`
    - Claro (`Light Clean`): ícone `Sun`
    - Automático (`Sistema`): ícone `Monitor` / `Laptop`
  - Aplicar estados visuais ativos (borda em `primary/40`, background destacado e badge ativo).
  - Assegurar área de toque >= 44x44px em cada botão.
- **🔵 Refactor:** Polimento com framer-motion ou classes glassmorphism interativas.

**Arquivos criados/alterados:**
- ALTERAR: `src/components/modals/ProfileModal.tsx`
**Teste:** `src/tests/Theme.spec.tsx`.

---

### Passo 6 — Formalização do Dual-Theme em `specs/design-system.md`

**O que faz:**
- Documentar na especificação central de design (`specs/design-system.md`):
  1. Tabela comparativa dos tokens OKLCH nos modos Dark Luxury e Light Clean;
  2. Relatório de contraste WCAG 2.1 AA para cada par de foreground/background;
  3. Diretrizes de uso de sombras e transparências de vidro no tema claro;
  4. Instruções para que novos componentes e gráficos respeitem as variáveis CSS semânticas.

**Arquivos criados/alterados:**
- ALTERAR: `specs/design-system.md`
**Teste:** Auditoria de documentação e revisão do Tech Lead.

---

### Passo 7 — Validação Integrada, Build e Conformidade Mecânica

**O que faz:**
- Executar `pnpm test` assegurando 100% de aprovação na suíte de testes.
- Executar `pnpm build` garantindo ausência de erros de compilação TypeScript (`tsc -b`) e Vite.
- Executar `pnpm standards:review` assegurando 0 inconformidades de padrões de código (zero `any`, sem `!important`, sem `function` tradicional, etc.).

**Arquivos criados/alterados:** Nenhum.
**Teste:** `pnpm test`, `pnpm build` e `pnpm standards:review`.

---

## 4. Arquivos Criados, Alterados e Removidos

### Arquivos Criados
```
src/types/theme.ts                     # Definições de tipagem estrita para temas
src/contexts/ThemeContext.tsx          # Contexto React com WebCrypto e listener de matchMedia
src/hooks/useTheme.ts                  # Hook de consumo useTheme()
src/tests/Theme.spec.tsx               # Suíte TDD cobrindo contexto, DOM, storage e toggles
```

### Arquivos Alterados
```
src/index.css                          # Tokens OKLCH (.light) e variantes glassmorphism
src/App.tsx                            # Inclusão do ThemeProvider, toggle no Header e Toaster dinâmico
src/components/landing/LandingHeader.tsx # Toggle de tema na Landing Page
src/components/modals/ProfileModal.tsx # Seção Aparência & Tema com seletor segmentado
src/components/ui/sonner.tsx           # Suporte dinâmico ao resolvedTheme no Toaster
specs/design-system.md                 # Documentação formal do Dual-Theme e tokens OKLCH
```

### Arquivos Removidos
```
Nenhum
```

---

## 5. Superfície de Regressão

| Arquivo de Teste / Módulo | O que testa | Risco de Quebra | Mitigação / Ação Preventiva |
|---|---|---|---|
| `src/tests/App.spec.tsx` | Renderização do shell principal do App | Baixo | `ThemeProvider` injetado no topo preserva árvore de nós |
| `src/tests/Theme.spec.tsx` | Comutação de temas, persistência e DOM | N/A (Novo) | Testes abrangentes com mocks de `localStorage` e `matchMedia` |
| `src/components/modals/ProfileModal.tsx` | Configurações de perfil e chaves BYOK | Baixo | Nova seção visual inserida sem afetar os inputs e formulários existentes |
| `src/components/landing/LandingHeader.tsx` | Cabeçalho e navegação institucional | Baixo | Botão de tema posicionado ao lado do CTA de login |
| `src/components/ui/sonner.tsx` | Notificações toast globais | Baixo | Fallback seguro para `dark` caso nenhum tema seja provido |
| Responsividade e Layout Visual | Viewports mobile (375px/390px) e desktop | Médio | Touch target mínimo de 44x44px e verificação de overflow horizontal |

---

## 6. Matriz de Rastreabilidade (Critérios de Aceite × Passos)

| Critério de Aceite (da `specs/spec.50.md`) | Atendido no Passo |
|---|---|
| Classe `.light` em `src/index.css` com todos os tokens OKLCH do tema claro | Passo 2 |
| Contraste WCAG 2.1 AA verificado (>= 4.5:1 para texto e >= 3.0:1 para UI) | Passos 2 e 6 |
| Proibição absoluta de `!important` no CSS | Passos 2 e 7 |
| `ThemeContext` e hook `useTheme` com Arrow Functions e zero `any` | Passo 1 |
| Persistência assíncrona segura via `encryptedStorageAdapter` | Passo 1 |
| Sincronização automática com `window.matchMedia` para o modo `system` | Passo 1 |
| Botão de alternância rápida no Header com `data-testid="header-theme-toggle-btn"` | Passo 3 |
| Botão de alternância na Landing Page com `data-testid="landing-theme-toggle-btn"` | Passo 4 |
| Seletor segmentado no `ProfileModal.tsx` (`data-testid="theme-selector-group"`) | Passo 5 |
| Notificações `Toaster` com tema dinâmico (`theme={resolvedTheme}`) | Passos 3 e 4 |
| Atualização dinâmica da meta tag `<meta name="theme-color">` | Passo 1 |
| Zero overflow horizontal em todas as resoluções | Passos 2, 3 e 5 |
| 100% de testes passando no Vitest (`pnpm test`) | Passos 1 e 7 |
| Build limpo sem erros (`pnpm build`) | Passo 7 |
| Auditoria mecânica aprovada em `pnpm standards:review` | Passo 7 |
| Homologação visual pelo UX Reviewer (Gate Anti-Slop Playwright) | Fase 4 do Pipeline |

---

## 7. O que Está Fora Deste Plano

- Criação de temas customizados adicionais pelo usuário ou paletas fora do Dual-Theme oficial (`Dark Luxury` e `Light Clean`).
- Alterações em schemas de banco de dados ou endpoints REST de backend (preferência de tema é cliente-side/dispositivo).
- Reescrita ou alteração estrutural de bibliotecas de gráficos (basta consumir as variáveis CSS semânticas já existentes).
