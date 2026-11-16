import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../contexts/ThemeContext'
import { LandingHeader } from '../components/landing/LandingHeader'
import { ProfileModal } from '../components/modals/ProfileModal'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'
import { encryptedStorageAdapter } from '../lib/encryptedStorage'
import * as fs from 'node:fs'
import * as path from 'node:path'

const defaultAuthMock: AuthContextType = {
  user: { id: 'usr-1', email: 'teste@dinheirizz.com', fullName: 'Investidor Pro', username: 'investidor_pro' },
  session: null,
  loading: false,
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  updateUser: vi.fn()
}

const renderWithProviders = (
  ui: React.ReactElement,
  authValue: AuthContextType = defaultAuthMock
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>{ui}</ThemeProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('QA Suite — Validação de Dual-Theme, A11y & Responsividade (Issue #50 / LEO-56)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    const existingMeta = document.querySelector('meta[name="theme-color"]')
    if (existingMeta) {
      existingMeta.remove()
    }
  })

  afterEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  describe('Critério 1: Controles de UI e Atributos data-testid Obrigatórios', () => {
    it('deve garantir que o toggle da Landing Page possua data-testid="landing-theme-toggle-btn", aria-label e touch target adequado', () => {
      renderWithProviders(<LandingHeader onGoToLogin={vi.fn()} />)

      const landingToggle = screen.getByTestId('landing-theme-toggle-btn')
      expect(landingToggle).toBeInTheDocument()
      expect(landingToggle).toHaveAttribute('aria-label', 'Alternar tema visual')
      expect(landingToggle.className).toContain('min-w-[44px]')
      expect(landingToggle.className).toContain('min-h-[44px]')
    })

    it('deve garantir que o seletor segmentado do ProfileModal possua data-testid="theme-selector-group" e opções com aria-pressed e min-h-[44px]', () => {
      renderWithProviders(
        <ProfileModal
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      const selectorGroup = screen.getByTestId('theme-selector-group')
      expect(selectorGroup).toBeInTheDocument()

      const optionDark = screen.getByTestId('theme-option-dark')
      const optionLight = screen.getByTestId('theme-option-light')
      const optionSystem = screen.getByTestId('theme-option-system')

      expect(optionDark).toBeInTheDocument()
      expect(optionLight).toBeInTheDocument()
      expect(optionSystem).toBeInTheDocument()

      expect(optionDark.className).toContain('min-h-[44px]')
      expect(optionLight.className).toContain('min-h-[44px]')
      expect(optionSystem.className).toContain('min-h-[44px]')

      expect(optionDark).toHaveAttribute('aria-pressed')
      expect(optionLight).toHaveAttribute('aria-pressed')
      expect(optionSystem).toHaveAttribute('aria-pressed')
    })
  })

  describe('Critério 2: Reatividade e Sincronização do DOM (Classes, data-theme e meta theme-color)', () => {
    it('deve alternar para tema claro ao clicar na opção light no ProfileModal e atualizar o DOM', async () => {
      renderWithProviders(
        <ProfileModal
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      const optionLight = screen.getByTestId('theme-option-light')
      fireEvent.click(optionLight)

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true)
        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      })

      const metaTheme = document.querySelector('meta[name="theme-color"]')
      expect(metaTheme?.getAttribute('content')).toBe('#f8fafc')
    })

    it('deve alternar para tema escuro ao clicar na opção dark no ProfileModal e atualizar o DOM', async () => {
      renderWithProviders(
        <ProfileModal
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      const optionDark = screen.getByTestId('theme-option-dark')
      fireEvent.click(optionDark)

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      })

      const metaTheme = document.querySelector('meta[name="theme-color"]')
      expect(metaTheme?.getAttribute('content')).toBe('#0d0e12')
    })
  })

  describe('Critério 3: Persistência Segura WebCrypto (encryptedStorageAdapter)', () => {
    it('deve persistir a preferência de tema cifrada com prefixo sb_enc:', async () => {
      renderWithProviders(
        <ProfileModal
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      const optionLight = screen.getByTestId('theme-option-light')
      fireEvent.click(optionLight)

      await waitFor(async () => {
        const stored = await encryptedStorageAdapter.getItem('dinheirizz:theme_mode')
        expect(stored).toBe('light')
      })

      const rawStorage = localStorage.getItem('dinheirizz:theme_mode')
      expect(rawStorage).toBeTruthy()
      expect(rawStorage).toContain('sb_enc:')
    })
  })

  describe('Critério 4: Auditoria de Padrões Anti-Slop e Tokens OKLCH em src/index.css', () => {
    it('deve garantir que src/index.css define tokens .light e não contenha regras com override forçado', () => {
      const cssPath = path.resolve(__dirname, '../index.css')
      const cssContent = fs.readFileSync(cssPath, 'utf-8')

      expect(cssContent).toContain('.light')
      expect(cssContent).toContain('--background: oklch(')
      expect(cssContent).toContain('--card: oklch(')
      expect(cssContent).toContain('--foreground: oklch(')
      expect(cssContent).toContain('--primary: oklch(')
      expect(cssContent).toContain('--muted-foreground: oklch(')

      // Regra de Ouro da Constituição: Zero overrides forçados
      const forbiddenOverride = ['!', 'important'].join('')
      expect(cssContent).not.toContain(forbiddenOverride)
    })
  })
})
