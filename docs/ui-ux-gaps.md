# Mapeamento de Oportunidades & Gaps de Consistência Visual (UI/UX)
## Dinheirizz 2.0 • Análise com Base em Intelligence Skills

> **Documento de Auditoria e Roadmap de Refinamento Visual**  
> **Fontes de inteligência utilizadas:** `ui-ux-pro-max`, `brand`, `design-system`, `web-design-guidelines`.

---

## 1. Visão Geral do Diagnóstico

Com a harmonização visual aplicada nesta etapa, unificamos a paleta Dark Luxury, tokens semânticos (`--primary`, `--background`, `--card`), botões de ação e a tipografia base com **Plus Jakarta Sans** e numerais tabulares (`.font-tabular`).

No entanto, para elevar a aplicação ao patamar de excelência comparável ao benchmark de mercado (**Pierre Finance** e diretrizes de design do iOS 18/OneUI 6), mapeamos os seguintes pontos de melhoria e componentes que ainda requerem evolução estrutural.

---

## 2. Inventário de Gaps & Inconsistências Mapeadas

### A. Elementos de Formulário: Selects & Dropdowns
* **Situação Atual:**
  * Diversos modais ([TransactionModal.tsx](file:///c:/Code/Leozizz/dinheirizz/src/components/modals/TransactionModal.tsx), [AccountModal.tsx](file:///c:/Code/Leozizz/dinheirizz/src/components/modals/AccountModal.tsx), [PixWalletModal.tsx](file:///c:/Code/Leozizz/dinheirizz/src/components/modals/PixWalletModal.tsx)) ainda utilizam tags HTML nativas `<select>` com hack de classes `[&>option]:bg-neutral-900`.
* **Problema Encontrado:**
  * Em dispositivos móveis (especialmente Safari no iOS e WebView PWA), o elemento `<select>` nativo invoca a roda de rolagem do sistema operacional (Wheel Picker), que quebra a imersão visual glassmorphism e impossibilita ícones ou formatação rica de saldos das contas.
* **Oportunidade de Melhoria:**
  * Substituir os `<select>` nativos por componentes acessíveis baseados em `@radix-ui/react-select` (já presente nas dependências do projeto), oferecendo drop-down vítreo estilizado (`backdrop-blur-md`), suporte a avatares dos bancos e busca integrada.

---

### B. Datepickers & Seleção Temporal
* **Situação Atual:**
  * Uso de `<input type="date">` no modal de transações.
* **Problema Encontrado:**
  * A renderização do calendário varia bruscamente entre navegadores Desktop (Chrome/Edge/Firefox) e Mobile (iOS/Android), com temas claros forçados pelo navegador em certos ambientes.
* **Oportunidade de Melhoria:**
  * Implementar Popover de data customizado utilizando `react-day-picker` (já instalado no projeto) ou um calendário tátil compacto estilo pílula rápida ("Hoje", "Ontem", "Outra data").

---

### C. Feedback de Validação & Micro-Interações de Formulários
* **Situação Atual:**
  * Erros de validação aparecem como caixas estáticas em bloco (`<div className="bg-destructive/15">`).
* **Oportunidade de Melhoria:**
  * Utilizar animações de entrada/saída suaves via Framer Motion (`<motion.p initial={{ opacity: 0, height: 0 }} ...>`) acoplados diretamente abaixo do respectivo campo com erro (inline validation), melhorando o score WCAG e UX em telas menores.

---

### D. Componentes Reutilizáveis de UI (`/src/components/ui/`)
* **Situação Atual:**
  * A pasta `src/components/ui/` contém hoje apenas [AnimatedNumber.tsx](file:///c:/Code/Leozizz/dinheirizz/src/components/ui/AnimatedNumber.tsx).
  * Vários estilos de inputs, botões e cards estão declarados inline repetidamente nos modais.
* **Oportunidade de Melhoria:**
  * Criar componentes primitivos no padrão shadcn/ui:
    * `Input.tsx`: Campo de texto padronizado com suporte a ícone esquerdo/direito e focus ring semântico.
    * `Select.tsx`: Radix Select com tema vítreo.
    * `Button.tsx`: Botão com variantes (`primary`, `secondary`, `destructive`, `ghost`) e estados de loading automáticos.

---

### E. Acessibilidade Mobile & Áreas de Toque (WCAG 2.1 AA)
* **Situação Atual:**
  * A maior parte dos botões atende ao alvo de toque de 44x44px (`min-h-[44px]` ou `min-h-[48px]`).
  * Alguns ícones de fechar modais (`X`) e links secundários de BYOK no perfil possuem áreas de toque próximas a 32px ou 36px.
* **Oportunidade de Melhoria:**
  * Expandir a área de clique invisível nesses botões menores via utilitário de hitbox expandido (`p-2 -m-2`) conforme recomendado nas diretrizes da Apple (Apple HIG).

---

## 3. Matriz de Priorização para Próximas Iterações

| Item | Complexidade | Impacto UX | Momento Sugerido |
| :--- | :---: | :---: | :--- |
| **Primitivos UI (Input, Button, Select)** | Média | Alto | Durante a evolução do Design System |
| **Radix Select nos Modais** | Baixa | Alto | Pode ser adotado na Issue #29 (novos campos de recorrência) |
| **Custom Date Picker** | Média | Médio | Pós Issue #29 |
| **Inline Form Validation** | Baixa | Médio | Melhoria contínua |

---

*Documento gerado automaticamente durante a consolidação da Issue #28 como referência viva de qualidade e refinamento do Dinheirizz.*
