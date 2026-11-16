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
