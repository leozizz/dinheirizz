# FinanceFlow Design System
## Glassmorphism UI - Apple-Inspired Dark Theme

> Sistema de design técnico para interfaces financeiras PWA com estética glassmorphism inspirada no ecossistema Apple. Otimizado para Mobile First com adaptações responsivas para tablet e desktop.

---

## 1. Paleta de Cores

### 1.1 Cores Semânticas (CSS Custom Properties)

```css
:root {
  /* === FUNDOS === */
  --background: oklch(0.12 0.01 260);        /* #1a1625 - Fundo principal escuro */
  --card: oklch(0.18 0.01 260 / 0.6);        /* Fundo de cards com transparência */
  --popover: oklch(0.16 0.01 260 / 0.9);     /* Overlays e popovers */
  --sidebar: oklch(0.14 0.01 260 / 0.8);     /* Sidebar com transparência */
  --input: oklch(0.22 0.01 260 / 0.5);       /* Campos de entrada */
  
  /* === TEXTO === */
  --foreground: oklch(0.98 0 0);             /* #fafafa - Texto principal */
  --muted-foreground: oklch(0.65 0 0);       /* #999999 - Texto secundário */
  --secondary-foreground: oklch(0.85 0 0);   /* Texto em elementos secundários */
  
  /* === CORES DE AÇÃO === */
  --primary: oklch(0.7 0.15 200);            /* #4da6ff - Azul primário */
  --primary-foreground: oklch(0.12 0.01 260);/* Texto sobre primary */
  --accent: oklch(0.75 0.12 170);            /* #5eead4 - Teal accent */
  --accent-foreground: oklch(0.12 0.01 260); /* Texto sobre accent */
  
  /* === ESTADOS === */
  --destructive: oklch(0.6 0.2 25);          /* #f87171 - Erro/Despesa */
  --destructive-foreground: oklch(0.98 0 0); /* Texto sobre destructive */
  
  /* === BORDAS E DIVISORES === */
  --border: oklch(0.35 0.01 260 / 0.3);      /* Bordas sutis */
  --ring: oklch(0.7 0.15 200 / 0.5);         /* Focus ring */
  
  /* === GRÁFICOS === */
  --chart-1: oklch(0.7 0.15 200);            /* Azul - Primary */
  --chart-2: oklch(0.75 0.12 170);           /* Teal - Accent */
  --chart-3: oklch(0.7 0.18 280);            /* Roxo */
  --chart-4: oklch(0.8 0.15 90);             /* Amarelo */
  --chart-5: oklch(0.65 0.2 25);             /* Vermelho */
}
```

### 1.2 Cores Funcionais (Hexadecimais Aproximados)

| Token               | OKLCH                        | Hex Aprox.   | Uso                           |
|---------------------|------------------------------|--------------|-------------------------------|
| `--background`      | `oklch(0.12 0.01 260)`       | `#1a1625`    | Fundo da aplicação            |
| `--foreground`      | `oklch(0.98 0 0)`            | `#fafafa`    | Texto principal               |
| `--primary`         | `oklch(0.7 0.15 200)`        | `#4da6ff`    | CTAs, links, destaques        |
| `--accent`          | `oklch(0.75 0.12 170)`       | `#5eead4`    | Elementos secundários         |
| `--destructive`     | `oklch(0.6 0.2 25)`          | `#f87171`    | Erros, despesas               |
| `--muted-foreground`| `oklch(0.65 0 0)`            | `#999999`    | Texto auxiliar                |

### 1.3 Cores de Categorias (Transações)

```typescript
const categoryColors = {
  alimentacao:  { bg: "bg-orange-500/20", text: "text-orange-400", hex: "#fb923c" },
  transporte:   { bg: "bg-blue-500/20",   text: "text-blue-400",   hex: "#60a5fa" },
  lazer:        { bg: "bg-purple-500/20", text: "text-purple-400", hex: "#a78bfa" },
  contas:       { bg: "bg-amber-500/20",  text: "text-amber-400",  hex: "#fbbf24" },
  assinaturas:  { bg: "bg-green-500/20",  text: "text-green-400",  hex: "#4ade80" },
  tecnologia:   { bg: "bg-slate-400/20",  text: "text-slate-300",  hex: "#cbd5e1" },
  compras:      { bg: "bg-pink-500/20",   text: "text-pink-400",   hex: "#f472b6" },
  viagem:       { bg: "bg-sky-500/20",    text: "text-sky-400",    hex: "#38bdf8" },
  receita:      { bg: "bg-emerald-500/20",text: "text-emerald-400",hex: "#34d399" },
}
```

### 1.4 Gradientes

```css
/* Gradient orbs decorativas (fundo) */
.gradient-orb-primary {
  background: oklch(0.7 0.15 200 / 0.08); /* primary/8 */
  filter: blur(120px);
}

.gradient-orb-accent {
  background: oklch(0.75 0.12 170 / 0.06); /* accent/6 */
  filter: blur(100px);
}

/* Avatar gradient */
.avatar-gradient {
  background: linear-gradient(to bottom right, var(--primary), var(--accent));
}

/* Progress bar gradient */
.progress-gradient {
  background: linear-gradient(to right, var(--primary), var(--accent));
}
```

---

## 2. Tokens de Vidro (Glassmorphism)

### 2.1 Configuração Base

```css
:root {
  /* Custom glass tokens */
  --glass-bg: oklch(0.2 0.01 260 / 0.4);
  --glass-border: oklch(0.5 0.01 260 / 0.2);
  --glass-highlight: oklch(1 0 0 / 0.05);
}
```

### 2.2 Variantes do GlassCard

| Variante   | Background        | Uso                                      |
|------------|-------------------|------------------------------------------|
| `default`  | `bg-white/5`      | Cards padrão, containers                 |
| `subtle`   | `bg-white/[0.03]` | Cards secundários, listas, ações rápidas |
| `strong`   | `bg-white/10`     | Cards em destaque (saldo, hero)          |

### 2.3 Classes Tailwind para Glass Effect

```typescript
// Classe base do GlassCard
const glassBase = cn(
  // Estrutura
  "relative rounded-3xl p-6",
  
  // Borda sutil
  "border border-white/10",
  
  // Efeito blur (CRÍTICO para glassmorphism)
  "backdrop-blur-xl",        // blur(24px)
  "backdrop-saturate-150",   // saturação aumentada
  
  // Highlight gradient interno
  "before:absolute before:inset-0 before:rounded-3xl",
  "before:bg-gradient-to-br before:from-white/10 before:to-transparent",
  "before:pointer-events-none",
  
  // Sombra profunda
  "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
  
  // Transição suave
  "transition-all duration-300 ease-out"
)
```

### 2.4 Estados Interativos

```css
/* Hover */
.glass-card:hover {
  background: rgba(255, 255, 255, 0.08); /* bg-white/[0.08] */
}

/* Active/Pressed */
.glass-card:active {
  background: rgba(255, 255, 255, 0.10); /* bg-white/10 */
  transform: scale(0.95);
}

/* Focus visible */
.glass-card:focus-visible {
  outline: none;
  ring: 2px solid oklch(0.7 0.15 200 / 0.5); /* ring-primary/50 */
}
```

---

## 3. Tipografia

### 3.1 Família de Fontes

```css
@theme inline {
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Geist Mono', 'SF Mono', Consolas, monospace;
}
```

### 3.2 Escala Tipográfica

| Elemento              | Mobile           | Tablet/Desktop      | Tailwind Class              |
|-----------------------|------------------|---------------------|-----------------------------|
| **Saldo (Hero)**      | `text-3xl`       | `text-4xl/text-5xl` | `font-bold tracking-tight`  |
| **Saldo (decimais)**  | `text-lg`        | `text-xl/text-2xl`  | `font-medium opacity-60`    |
| **Títulos de Seção**  | `text-sm`        | `text-base`         | `font-medium`               |
| **Labels**            | `text-xs`        | `text-sm`           | `text-muted-foreground`     |
| **Corpo**             | `text-sm`        | `text-sm`           | `font-medium`               |
| **Valores monetários**| `text-sm`        | `text-sm`           | `font-semibold tabular-nums`|
| **Badges/Tags**       | `text-xs`        | `text-sm`           | `font-medium`               |

### 3.3 Utilitários de Texto

```typescript
// Valores monetários (alinhamento numérico)
"tabular-nums"

// Truncar texto longo
"truncate" // ou "text-ellipsis overflow-hidden whitespace-nowrap"

// Texto secundário
"text-muted-foreground"

// Texto sobre cores de estado
"text-emerald-400" // Receitas/Positivo
"text-rose-400"    // Despesas/Negativo
"text-foreground"  // Neutro
```

---

## 4. Componentes

### 4.1 GlassCard

```tsx
interface GlassCardProps {
  variant?: "default" | "subtle" | "strong"
  className?: string
  children: React.ReactNode
}

// Uso
<GlassCard variant="strong" className="overflow-hidden">
  {children}
</GlassCard>
```

### 4.2 Botões

#### Botão Primário (Touch-Optimized)
```tsx
// Área de toque mínima: 44x44px (Apple HIG)
<button className={cn(
  // Tamanho mínimo de toque
  "min-w-[44px] min-h-[44px]",
  "p-2.5 -m-2.5", // Padding + margem negativa para hitbox maior
  
  // Visual
  "rounded-full",
  
  // Estados
  "hover:bg-white/5",
  "active:bg-white/10",
  "transition-colors",
  
  // Focus
  "focus:outline-none focus:ring-2 focus:ring-primary/30"
)}>
```

#### Botão de Ação Rápida
```tsx
<button className={cn(
  // Container
  "flex flex-col items-center justify-center gap-2",
  "py-4 px-2 min-h-[88px]", // Mobile
  "lg:p-5 lg:min-h-[110px]", // Desktop
  
  // Estados
  "hover:bg-white/[0.08]",
  "active:scale-95",
  "transition-all duration-200"
)}>
  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-primary/20 text-primary">
    <Icon />
  </div>
  <span className="text-xs lg:text-base font-medium">{label}</span>
</button>
```

### 4.3 Inputs

```tsx
<input className={cn(
  // Layout
  "w-full pl-11 pr-4 py-2.5 lg:py-3",
  
  // Visual
  "rounded-2xl",
  "bg-white/5",
  "border border-white/10",
  
  // Texto
  "text-sm text-foreground",
  "placeholder:text-muted-foreground/60",
  
  // Focus
  "focus:outline-none",
  "focus:ring-2 focus:ring-primary/30",
  "focus:border-primary/40",
  
  // Transição
  "transition-all"
)} />
```

### 4.4 Badge de Status

```tsx
// Positivo (Receita)
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  <span className="text-xs font-medium text-emerald-400">+R$ 3.240</span>
</div>

// Negativo (Despesa)
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
  <span className="text-xs font-medium text-rose-400">-R$ 4.000</span>
</div>
```

### 4.5 Lista de Transações

```tsx
// Item de lista (Mobile)
<button className={cn(
  "w-full flex items-center gap-3.5",
  "px-5 py-3.5 min-h-[72px]", // Área de toque otimizada
  "hover:bg-white/[0.03]",
  "active:bg-white/[0.06]",
  "transition-colors"
)}>
  {/* Ícone */}
  <div className="w-11 h-11 rounded-2xl bg-{category}/20 text-{category}-400">
    <CategoryIcon />
  </div>
  
  {/* Info */}
  <div className="flex-1 min-w-0 text-left">
    <p className="text-sm font-medium text-foreground truncate">{title}</p>
    <p className="text-xs text-muted-foreground">{category} • {date}</p>
  </div>
  
  {/* Valor */}
  <span className="text-sm font-semibold tabular-nums">{amount}</span>
  
  {/* Chevron */}
  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
</button>
```

---

## 5. Animações

### 5.1 Transições CSS Padrão

```css
/* Transição suave padrão */
.transition-base {
  transition-property: all;
  transition-duration: 300ms;
  transition-timing-function: ease-out;
}

/* Transição rápida (hover) */
.transition-fast {
  transition-duration: 200ms;
}

/* Transição de cor apenas */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-duration: 200ms;
}
```

### 5.2 Framer Motion Presets

```typescript
// Spring suave (recomendado para UI elements)
const springConfig = {
  type: "spring",
  stiffness: 300,
  damping: 30,
}

// Fade in/out
const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
}

// Scale com spring
const scaleVariants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: springConfig
}

// Slide up (para modais/sheets)
const slideUpVariants = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: { type: "spring", damping: 25, stiffness: 300 }
}
```

### 5.3 Hover/Active States

```typescript
// Botão com scale
const buttonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.2 }
}

// Card interativo
const cardMotion = {
  whileHover: { 
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    transition: { duration: 0.2 }
  },
  whileTap: { scale: 0.98 }
}
```

---

## 6. Classes Tailwind

### 6.1 Utilitários Customizados

```css
@layer utilities {
  /* Safe areas para PWA */
  .pt-safe-top {
    padding-top: env(safe-area-inset-top, 0px);
  }
  .pb-safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .h-safe-bottom {
    height: env(safe-area-inset-bottom, 0px);
  }
}
```

### 6.2 Classes de Layout Responsivo

```typescript
// Container máximo por breakpoint
const containerClasses = {
  mobile:  "max-w-md",      // 448px
  tablet:  "md:max-w-3xl",  // 768px
  desktop: "lg:max-w-6xl",  // 1152px
  wide:    "xl:max-w-7xl",  // 1280px
}

// Grid layouts
const gridLayouts = {
  mobileStack: "space-y-5",
  tabletGrid:  "md:grid md:grid-cols-2 md:gap-5",
  desktopGrid: "lg:grid lg:grid-cols-12 lg:gap-6",
}
```

### 6.3 Padrões de Spacing

```typescript
// Padding interno de cards
const cardPadding = "p-5 lg:p-6 xl:p-7"

// Gap entre elementos
const sectionGap = "gap-5 md:gap-6 lg:gap-8"

// Padding de página
const pagePadding = "px-5 md:px-8 lg:px-10"
```

### 6.4 Classes de Interatividade

```typescript
// Área de toque mínima (44px - Apple HIG)
const touchTarget = "min-w-[44px] min-h-[44px]"

// Hitbox expandido
const expandedHitbox = "p-2.5 -m-2.5"

// Estados hover/active para glass
const glassInteractive = cn(
  "hover:bg-white/[0.03]",
  "active:bg-white/[0.06]",
  "transition-colors"
)

// Botão com feedback tátil
const tactileFeedback = cn(
  "active:scale-95",
  "transition-all duration-200"
)
```

### 6.5 Scrollbar Customizada

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: oklch(0.4 0.01 260 / 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: oklch(0.5 0.01 260 / 0.4);
}
```

---

## 7. Breakpoints Responsivos

| Breakpoint | Largura   | Layout                    | Ajustes                              |
|------------|-----------|---------------------------|--------------------------------------|
| Mobile     | < 768px   | Stack vertical            | Tipografia menor, touch-optimized   |
| Tablet     | ≥ 768px   | Grid 2 colunas            | Cards lado a lado                    |
| Desktop    | ≥ 1024px  | Grid 12 colunas (8+4)     | Sidebar, tabela, busca visível       |
| Wide       | ≥ 1280px  | Espaçamento aumentado     | Tipografia hero maior                |

---

## 8. Ícones

### 8.1 Biblioteca
- **Lucide React** (recomendado)
- Stroke width: `1.5` (padrão Apple)

### 8.2 Tamanhos

| Contexto          | Mobile      | Desktop     | Tailwind            |
|-------------------|-------------|-------------|---------------------|
| Header actions    | `w-5 h-5`   | `w-5.5 h-5.5` | `w-5 h-5 lg:w-5.5`|
| Quick actions     | `w-5 h-5`   | `w-6 h-6`   | `w-5 h-5 lg:w-6`   |
| Lista transações  | `w-5 h-5`   | `w-5 h-5`   | `w-5 h-5`          |
| Badges            | `w-3.5 h-3.5`| `w-4 h-4`  | `w-3.5 h-3.5 lg:w-4`|

---

## 9. Acessibilidade

### 9.1 Touch Targets
- Mínimo: **44x44px** (Apple Human Interface Guidelines)
- Usar `min-w-[44px] min-h-[44px]` em todos os elementos interativos

### 9.2 Contraste
- Texto principal sobre fundo: **15.8:1** (WCAG AAA)
- Texto secundário: **7.2:1** (WCAG AA)

### 9.3 ARIA Labels
```tsx
<button aria-label="Ocultar saldo">
  <EyeOff />
</button>

<section aria-label="Transações recentes">
  <TransactionsList />
</section>
```

### 9.4 Focus Management
```css
/* Focus visible apenas para navegação por teclado */
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## 10. PWA Considerations

### 10.1 Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#1a1625">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### 10.2 Safe Areas
- Sempre usar `pt-safe-top` no header
- Sempre usar `pb-safe-bottom` ou `h-safe-bottom` no footer

---

## Changelog

| Versão | Data       | Alterações                                    |
|--------|------------|-----------------------------------------------|
| 1.0.0  | 2026-05-11 | Versão inicial do Design System Glassmorphism |

---

> **Nota:** Este documento serve como referência técnica para implementação. Todas as cores usam o espaço de cor OKLCH para melhor consistência perceptual. Para conversão para outros formatos, utilize ferramentas como [oklch.com](https://oklch.com).
