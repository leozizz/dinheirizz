# spec.50.md
# Especificação de Implementação

> **Dois blocos distintos neste arquivo:**
>
> `PROJECT CONTEXT` — preenchido pelo `setup.md` uma vez por projeto. Não alterar por issue.
> `ISSUE CONTEXT`   — preenchido pelo `generate-spec.md` a cada issue.
>
> Remova seções inteiras do ISSUE CONTEXT que não se aplicarem à task atual.

---

<!-- ═══ PROJECT CONTEXT — preenchido pelo setup.md ═══ -->

## PC-1. Stack do Projeto

### Frontend
```
Framework:      React 19 (PWA)
Linguagem:      TypeScript 5 (Strict Mode)
Build:          Vite 6 + VitePWA
Estilização:    Tailwind CSS v4 + Vanilla CSS Tokens OKLCH (Dual-Theme & Glassmorphism)
Componentes:    Radix UI / shadcn/ui + Design System Próprio
Roteamento:     React Router / SPA Routing
Estado:         React Context / Custom Hooks + TanStack React Query v5
Armazenamento:  WebCrypto AES-GCM (encryptedStorageAdapter)
```

### Backend
```
Framework:      Hono.js 4 (/api)
Runtime:        Cloudflare Pages Functions / Workers (Edge)
Linguagem:      TypeScript 5 (Strict Mode)
Autenticação:   Supabase Auth (JWT Bearer)
```

### Banco de Dados
```
Banco:          PostgreSQL (Supabase Cloud)
ORM / Query:    Drizzle ORM
Migrations:     Supabase CLI + Drizzle Kit
```

### Infraestrutura
```
Hospedagem:     Cloudflare Pages
Storage:        Supabase Storage
CI/CD:          GitHub Actions
```

---

## PC-2. CLIs Disponíveis

```bash
pnpm            # Gerenciador de pacotes preferencial
supabase        # Supabase CLI (migrations, gen types, link)
drizzle-kit     # Drizzle ORM migrations e schema generation
wrangler        # Cloudflare CLI para Pages & Workers
```

---

## PC-3. Estrutura de Pastas

```
/
├── api/            # Backend BFF HonoJS (Edge Functions para Cloudflare Pages)
│   ├── src/        # Rotas, controllers, middlewares e DB client
│   └── tests/      # Testes de integração do BFF com mocks do Drizzle
├── src/            # Frontend React SPA / PWA
│   ├── components/ # Componentes visuais e Glassmorphism Design System
│   ├── contexts/   # Contextos de autenticação, tema e estado global
│   ├── hooks/      # Custom React hooks
│   ├── lib/        # Utilitários, WebCrypto e instâncias de clientes
│   ├── types/      # Tipagens TypeScript e database.types.ts
│   └── tests/      # Testes unitários do frontend (Vitest + Testing Library)
├── specs/          # Especificações SDD (spec.*.md, plan.*.md, testing.md, design-system.md)
└── public/         # Assets estáticos, manifest PWA, ícones
```

---

## PC-4. Convenções do Projeto

```
Nomenclatura de branches:  feat/{id}-{slug}, fix/{id}-{slug}
Padrão de commits:         Conventional Commits (feat:, fix:, chore:, refactor:, test:)
Localização de testes:     api/tests/*.spec.ts, src/tests/*.spec.tsx
Variáveis de ambiente:     .env, .env.local, .env.example
Documentação interna:      specs/design-system.md, specs/testing.md, AGENTS.md, STANDARDS.md
```

---

## PC-5. Restrições Permanentes do Projeto

```
- Sem `any` em TypeScript — strict mode obrigatório em todo o repositório
- Uso estrito de Arrow Functions (`const fn = () => {}`) em componentes e lógica de negócio (proibido function tradicional)
- Dual-Theme oficial obrigatório: Dark Luxury (#0d0e12 + Neon Lime) e Light Clean (Gelo ardósia + Verde fintech alto contraste)
- Fidelidade visual estrita a specs/design-system.md (OKLCH, Glassmorphism, Dual-Theme)
- Proibido o uso de `!important` no CSS — respeitar especificidade e tokens semânticos
- data-testid obrigatório em todos os botões, campos de entrada e seletores interativos
- Proibido executar queries destrutivas ou migrações reais em nuvem durante testes automatizados
- Backend BFF alocado exclusivamente no diretório /api utilizando HonoJS (Edge runtime compatível)
- Isolamento de runtime: proibido importar node:fs, path ou crypto do Node em src/; utilizar crypto.subtle (Web Crypto API)
- Gerenciamento de pacotes estritamente com pnpm
- Sem console.log em código de produção e sem blocos catch vazios
- Acessibilidade e áreas de toque com mínimo de 44x44px (Apple HIG / WCAG 2.1 AA)
- Sem overflow horizontal (scrollWidth <= innerWidth) em viewports mobile (375px/390px), tablet (768px) e desktop (1280px+)
- Codificação nativa UTF-8 em todos os textos, comentários e documentações (zero mojibake)
```

## PC-6. MCPs Disponíveis

- MCP GitHub - Operações de Issues, PRs e consultas Git.
- MCP Playwright - Inspeção de layout, responsividade mobile/desktop e validação visual de temas.

<!-- ═══ FIM DO PROJECT CONTEXT ═══ -->

---
---

<!-- ═══ ISSUE CONTEXT — preenchido pelo generate-spec.md por issue ═══ -->

## 1. Identificação

```
Issue principal:    #50 (GitHub) / LEO-56 (Paperclip)
Título:             feat(ui): Implementação do Tema Claro Oficial (Light Clean) e Persistência de Dual-Theme
Tipo:               feat
Branch:             feat/50-dual-theme-light-clean
Milestone:          Dinheirizz 2.0 - Design System & Visual Excellence
Status:             Pronto para Auditoria do Tech Lead (Fase 1 SDD Concluída)
Data de Criação:    2026-11-13T18:51:32Z
Data da Spec:       2026-11-16T12:56:00Z
Autor:              Dinheirizz | PM (Product Manager & Arquiteto SDD)
```

**Issues relacionadas**
```
#1   🚀 [Epic] Dinheirizz 2.0: Nova Arquitetura e Roadmap
#13  [Fase 1.8] Hardening de Autenticação: Validação Avançada de Cadastro e Criptografia WebCrypto
#33  feat(ai): Leitura e Registro Automático de Comprovantes via IA Multimodal
#34  feat(ux): Visão de Calendário Financeiro Interativo
```

---

## 2. Contexto

A Constituição do Projeto Dinheirizz (`AGENTS.md`, Regra de Ouro nº 3) estipula que a plataforma deve oferecer dois temas oficiais de primeira classe: **Dark Luxury** (fundo ônix profundo `#0d0e12` com acentos verde lima) e **Light Clean** (fundo claro gelo/ardósia de alto contraste, sem ofuscamento e com legibilidade impecável sob luz solar direta).

Atualmente, o arquivo `src/index.css` define apenas as variáveis CSS sob `:root` para o tema escuro. O componente de notificações `Toaster` (Sonner) possui a propriedade `theme="dark"` estaticamente definida, e a aplicação carece de:
1. Uma definição padronizada de tokens semânticos OKLCH para o tema claro sob a classe `.light`.
2. Um sistema unificado e reativo de gestão de temas (`ThemeContext` + hook `useTheme`) com suporte aos modos `dark`, `light` e detecção automática do sistema operacional (`system` via `prefers-color-scheme`).
3. Persistência segura e resiliente da escolha do usuário utilizando `encryptedStorageAdapter` (WebCrypto AES-GCM), evitando *Flash of Unstyled Content* (FOUC).
4. Controles visuais acessíveis no **Header principal**, no **LandingHeader** e no **ProfileModal (Configurações > Aparência)**.
5. Homologação rigorosa de contraste cromático conforme **WCAG 2.1 AA** (mínimo de 4.5:1 para texto normal e 3.0:1 para elementos de interface/gráficos).

Esta especificação define a arquitetura, os contratos, os tokens visuais e os testes para a entrega completa do Dual-Theme no Dinheirizz 2.0.

---

## 3. Leitura Obrigatória Antes de Qualquer Código

### 3.1 Documentação interna
```
AGENTS.md                # Regras de ouro: Arrow functions, sem any, data-testid obrigatório, sem !important
STANDARDS.md             # Padrões arquiteturais e comandos de validação mecânica
specs/design-system.md   # Tokens de cores OKLCH, Glassmorphism, tipografia e tamanhos de toque (44px)
specs/testing.md         # Estratégia de testes no Vitest e Playwright
```

### 3.2 Arquivos-chave do repositório
```
src/index.css                            # Definição de tokens de design e classes glassmorphism
src/lib/encryptedStorage.ts              # Adaptador de armazenamento com WebCrypto AES-GCM
src/App.tsx                              # Entrypoint da aplicação, Header e injeção de Toaster
src/components/modals/ProfileModal.tsx   # Modal de configurações e perfil do usuário
src/components/landing/LandingHeader.tsx # Cabeçalho da Landing Page
src/components/ui/sonner.tsx             # Wrapper de notificações Toaster
```

---

## 4. Escopo da Funcionalidade

### Está incluso (In Scope)

1. **Tokens Semânticos OKLCH do Tema Claro (`.light`) em `src/index.css`:**
   - Adicionar o bloco `.light` com valores calibrados para estética fintech clean, minimalista e inspirada em Apple HIG / OneUI:
     - `--background`: `oklch(0.985 0.002 260)` (Gelo ardósia anti-glare, elimina fadiga visual do branco puro #ffffff).
     - `--card`: `oklch(1 0 0 / 0.80)` (Vidro fosco claro de alta legibilidade).
     - `--card-foreground`: `oklch(0.18 0.015 260)` (Cinza ônix para contraste superior a 12:1 com o card).
     - `--popover`: `oklch(1 0 0 / 0.96)`.
     - `--popover-foreground`: `oklch(0.18 0.015 260)`.
     - `--sidebar`: `oklch(0.975 0.004 260 / 0.90)`.
     - `--sidebar-foreground`: `oklch(0.18 0.015 260)`.
     - `--input`: `oklch(0.95 0.005 260 / 0.80)`.
     - `--foreground`: `oklch(0.15 0.015 260)` (Texto principal nítido).
     - `--muted`: `oklch(0.93 0.006 260 / 0.70)`.
     - `--muted-foreground`: `oklch(0.42 0.015 260)` (Texto secundário atendendo WCAG AA com contraste >= 4.8:1).
     - `--secondary`: `oklch(0.935 0.006 260 / 0.75)`.
     - `--secondary-foreground`: `oklch(0.20 0.015 260)`.
     - `--primary`: `oklch(0.55 0.17 142)` (Verde esmeralda fintech profundo, ajustado para fundo claro com contraste >= 4.6:1).
     - `--primary-foreground`: `oklch(0.98 0 0)` (Branco puro sobre primary).
     - `--accent`: `oklch(0.48 0.14 195)` (Teal/Ciano profundo para tema claro).
     - `--accent-foreground`: `oklch(0.98 0 0)`.
     - `--destructive`: `oklch(0.58 0.22 25)` (Coral escuro para despesas com contraste > 4.5:1).
     - `--destructive-foreground`: `oklch(0.98 0 0)`.
     - `--success`: `oklch(0.52 0.17 142)`.
     - `--success-foreground`: `oklch(0.98 0 0)`.
     - `--border`: `oklch(0.85 0.008 260 / 0.60)` (Linhas vítreas sutis).
     - `--ring`: `oklch(0.55 0.17 142 / 0.40)`.
   - Ajustes de classes utilitárias de vidro e sombras no modo claro:
     - `.light .glass-card` e `.light .glass-card-interactive`: sombras difusas suaves (`box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06)`), sem blocos pretos opressivos.
     - `.light .glass-card-interactive:hover`: elevação leve e iluminação translúcida (`oklch(1 0 0 / 0.95)`).
     - `.light .gradient-orb-primary` e `.light .gradient-orb-accent`: opacidade calibrada em 0.03 para iluminação ambiente sem prejudicar o contraste de leitura.

2. **Criação do `ThemeContext` e Hook `useTheme` (`src/contexts/ThemeContext.tsx`, `src/hooks/useTheme.ts`):**
   - Tipos estritos:
     ```typescript
     export type ThemeMode = 'dark' | 'light' | 'system'
     export type ResolvedTheme = 'dark' | 'light'
     ```
   - Persistência com `encryptedStorageAdapter` sob a chave `dinheirizz:theme_mode`.
   - Inicialização resiliente e instantânea: leitura antecipada com fallback limpo para `dark` caso o storage esteja vazio ou antes de inicializar o WebCrypto, prevenindo FOUC e tela em branco.
   - Sincronização dinâmica com o DOM:
     - Adicionar/remover a classe `light` ou `dark` no elemento `document.documentElement` (`<html class="light">` / `<html class="dark">`).
     - Sincronizar o atributo `data-theme` no `<html>` (`data-theme="light"` / `data-theme="dark"`).
     - Atualizar a meta tag `<meta name="theme-color">` no `<head>` (`#0d0e12` para dark e `#f8fafc` para light).
   - Listener de preferência de sistema:
     - Escuta alterações de `window.matchMedia('(prefers-color-scheme: dark)')` quando o modo selecionado for `system`.
     - Reatribuição imediata de `resolvedTheme` quando a preferência do sistema operacional mudar.

3. **Integração no Header da Aplicação (`src/App.tsx`):**
   - Inclusão de botão de alternância rápida de tema:
     - Localizado na barra superior (ao lado de Notificações / Perfil).
     - Exibe ícone `Sun` (quando tema atual for dark) ou `Moon` (quando tema atual for light).
     - `data-testid="header-theme-toggle-btn"`.
     - `aria-label="Alternar tema visual"`.
     - Hitbox mínima garantida de 44x44px (Apple HIG).
     - Alterna ciclicamente entre Dark e Light ao clique direto.

4. **Integração no Cabeçalho da Landing Page (`src/components/landing/LandingHeader.tsx`):**
   - Botão de alternância rápida de tema para visitantes não autenticados.
   - `data-testid="landing-theme-toggle-btn"`.
   - Sincronizado com o mesmo `ThemeContext`.

5. **Seção de Aparência e Tema no Modal de Perfil (`src/components/modals/ProfileModal.tsx`):**
   - Novo bloco visual "Aparência & Tema" na aba de configurações.
   - Três opções em controle segmentado moderno:
     - `Escuro (Dark Luxury)`: Ícone `Moon`, `data-testid="theme-option-dark"`.
     - `Claro (Light Clean)`: Ícone `Sun`, `data-testid="theme-option-light"`.
     - `Automático (Sistema)`: Ícone `Monitor` / `Laptop`, `data-testid="theme-option-system"`.
   - Feedback visual imediato com borda destacada e badge ativo.

6. **Sincronização com o Sistema de Notificações (`sonner` / `Toaster`):**
   - Atualizar `src/App.tsx`, `src/components/auth/LoginScreen.tsx` e `src/components/ui/sonner.tsx` para passar a prop `theme={resolvedTheme}` dinamicamente, abandonando o hardcoded `theme="dark"`.

7. **Atualização da Documentação (`specs/design-system.md`):**
   - Documentar formalmente os tokens OKLCH do tema claro, proporções de contraste WCAG AA e exemplos de classes glassmorphism no modo claro.

### Está fora do escopo (Out of Scope)

- ❌ Criação de paletas cromáticas adicionais de nicho (ex: High Contrast puro preto/branco, sépia, temas customizados por usuário). O escopo é estritamente o Dual-Theme oficial (`Dark Luxury` e `Light Clean`).
- ❌ Modificações de backend, rotas Hono ou novas colunas em banco de dados Supabase/Drizzle. O tema é uma preferência de dispositivo/cliente gerenciada via `encryptedStorageAdapter`.
- ❌ Refatoração de bibliotecas de gráficos além de garantir que as variáveis CSS semânticas (`--chart-1` a `--chart-5`, `--card-foreground`, `--muted-foreground`) sejam respeitadas.

---

## 5. Contratos e Interfaces

### 5.1 Tipagem do Tema (`src/types/theme.ts` ou `src/contexts/ThemeContext.tsx`)

```typescript
export type ThemeMode = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export interface ThemeContextType {
  /** Modo selecionado pelo usuário (dark, light ou system) */
  theme: ThemeMode
  /** Tema efetivamente aplicado ao DOM após resolução do SO */
  resolvedTheme: ResolvedTheme
  /** Altera a preferência de tema */
  setTheme: (theme: ThemeMode) => Promise<void>
  /** Alterna diretamente entre 'dark' e 'light' */
  toggleTheme: () => Promise<void>
}
```

### 5.2 Contrato de Persistência no Storage

```typescript
const THEME_STORAGE_KEY = 'dinheirizz:theme_mode'

// Payload persistido via encryptedStorageAdapter:
// "dark" | "light" | "system"
```

---

## 6. Arquivos que Serão Criados ou Alterados

```
CRIAR:
  src/contexts/ThemeContext.tsx         # Provedor de contexto do Dual-Theme com WebCrypto
  src/hooks/useTheme.ts                 # Hook utilitário useTheme()
  src/tests/Theme.spec.tsx              # Suíte de testes unitários do ThemeContext e alternância

ALTERAR:
  src/index.css                         # Adição da classe .light com tokens OKLCH e ajustes de sombras
  src/App.tsx                           # Envolvimento com ThemeProvider, toggle no Header e Toaster dinâmico
  src/components/modals/ProfileModal.tsx# Seção de Aparência com botões Dark, Light e Sistema
  src/components/landing/LandingHeader.tsx # Toggle de tema na Landing Page
  src/components/auth/LoginScreen.tsx   # Toaster adaptativo ao tema ativo
  src/components/ui/sonner.tsx          # Toaster wrapper com suporte dinâmico ao tema
  specs/design-system.md                # Atualização da documentação oficial do Design System
```

---

## 7. Estratégia de Testes (TDD)

### 🔴 Red — testes que devem falhar primeiro (`src/tests/Theme.spec.tsx`)

```typescript
// 1. Deve inicializar por padrão no modo dark quando não houver preferência salva
// 2. Deve carregar a preferência 'light' persistida em encryptedStorageAdapter
// 3. Deve alternar para 'light' ao invocar setTheme('light') e aplicar a classe no documentElement
// 4. Deve aplicar a classe 'dark' e atualizar o atributo data-theme ao invocar setTheme('dark')
// 5. Deve resolver 'resolvedTheme' de acordo com matchMedia quando o modo for 'system'
// 6. Deve atualizar a meta tag theme-color para a cor correspondente (#0d0e12 ou #f8fafc)
// 7. Toggle do Header deve alternar entre dark e light ao ser clicado
// 8. Seletor no ProfileModal deve refletir e permitir a escolha das 3 opções (dark, light, system)
```

### 🟢 Green — mínimo para os testes passarem

1. Implementar tokens OKLCH sob `.light` em `src/index.css`.
2. Implementar `ThemeContext.tsx` e `useTheme.ts` com sincronização de classes no DOM e persistência em `encryptedStorageAdapter`.
3. Adicionar o `ThemeProvider` no topo da árvore de componentes em `src/App.tsx`.
4. Implementar o botão de alternância no Header com `data-testid="header-theme-toggle-btn"`.
5. Implementar a seção de Aparência no `ProfileModal.tsx` com `data-testid="theme-option-*"` e `data-testid="theme-selector-group"`.
6. Conectar o `Toaster` à prop `theme={resolvedTheme}`.

### 🔵 Refactor — oportunidades após o green

1. Refinar transições CSS de cores suaves (`transition: background-color 0.2s ease, color 0.2s ease`).
2. Validar que nenhuma cor hardcoded em componentes do dashboard cause baixo contraste no tema claro.
3. Assegurar que todas as hitboxes atendam rigorosamente ao tamanho mínimo de 44x44px da Apple HIG.

---

## 8. Critérios de Aceite

```
- [ ] Classe `.light` implementada em `src/index.css` contendo todos os tokens semânticos OKLCH do tema claro oficial.
- [ ] Contraste cromático de todos os tokens de texto no tema claro atendendo rigorosamente à norma WCAG 2.1 AA (mínimo de 4.5:1 para texto normal e 3:1 para elementos de interface e gráficos).
- [ ] Proibido o uso de `!important` nas regras CSS do tema claro.
- [ ] Provedor `ThemeContext` e hook `useTheme` implementados utilizando Arrow Functions e TypeScript estrito (zero `any`).
- [ ] Persistência de tema funcionando através do `encryptedStorageAdapter` com suporte aos modos `dark`, `light` e `system`.
- [ ] Sincronização automática com a preferência do sistema operacional (`window.matchMedia`) quando o modo for `system`.
- [ ] Botão de alternância rápida de tema presente no Header (`src/App.tsx`) com `data-testid="header-theme-toggle-btn"` e hitbox >= 44x44px.
- [ ] Botão de alternância presente no cabeçalho da Landing Page (`LandingHeader.tsx`) com `data-testid="landing-theme-toggle-btn"`.
- [ ] Seletor completo de tema (Dark, Light, Sistema) integrado ao `ProfileModal.tsx` com `data-testid="theme-selector-group"` e `data-testid="theme-option-{dark,light,system}"`.
- [ ] Notificações `Toaster` (Sonner) recebendo dinamicamente o tema ativo (`theme={resolvedTheme}`).
- [ ] Meta tag `<meta name="theme-color">` atualizada no DOM para refletir o tema selecionado.
- [ ] Zero overflow horizontal (`scrollWidth <= innerWidth`) verificado em resoluções mobile (375px/390px), tablet (768px) e desktop (1280px+).
- [ ] 100% dos testes unitários e de integração passando no Vitest (`pnpm test`).
- [ ] Build de produção executado com sucesso e sem warnings (`pnpm build`).
- [ ] Conformidade mecânica aprovada em `pnpm standards:review`.
- [ ] Homologação visual aprovada pelo UX Reviewer (Gate Anti-Slop via Playwright) em ambos os temas.
```

---

## 9. Checklist de Auditoria Visual & Gate Anti-Slop (UX Reviewer)

```
[ ] Nenhum elemento de texto fica ilegível ou cinza-claro sobre fundo branco no tema claro.
[ ] Os cartões de vidro (.glass-card) no tema claro mantêm legibilidade com sombras suaves, sem artefatos escuros pesados.
[ ] Os gráficos de fluxo de caixa (CashFlowChart) e categorias (CategoryDonutChart) permanecem nítidos e legíveis em ambos os temas.
[ ] A transição entre temas não causa piscar de tela (FOUC), layout shifts ou redimensionamento de elementos.
[ ] Todos os botões de alternância e seletores possuem data-testid e área de toque mínima de 44x44px.
```
