import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { HeroSection } from '../components/landing/HeroSection'
import type { BeforeInstallPromptEvent } from '../hooks/usePwaInstall'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

interface MutableNavigator {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone?: boolean
}

const createBeforeInstallPromptEvent = (
  outcome: 'accepted' | 'dismissed' = 'accepted',
  promptPromise?: () => Promise<void>,
): BeforeInstallPromptEvent & { promptMock: ReturnType<typeof vi.fn> } => {
  const promptMock = vi.fn(promptPromise ?? (async () => undefined))
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent & {
    promptMock: ReturnType<typeof vi.fn>
  }

  Object.defineProperty(event, 'preventDefault', {
    value: vi.fn(),
    configurable: true,
  })
  Object.defineProperty(event, 'platforms', {
    value: ['web'],
    configurable: true,
  })
  Object.defineProperty(event, 'prompt', {
    value: promptMock,
    configurable: true,
  })
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome, platform: 'web' }),
    configurable: true,
  })
  event.promptMock = promptMock

  return event
}

describe('HeroSection PWA Install Integration', () => {
  const originalUserAgent = navigator.userAgent
  const originalPlatform = navigator.platform
  const originalMaxTouchPoints = navigator.maxTouchPoints
  const originalStandalone = (navigator as unknown as MutableNavigator).standalone
  const originalMatchMedia = window.matchMedia

  const setNavigatorProps = (props: Partial<MutableNavigator>): void => {
    if (props.userAgent !== undefined) {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: props.userAgent,
        configurable: true,
      })
    }
    if (props.platform !== undefined) {
      Object.defineProperty(window.navigator, 'platform', {
        value: props.platform,
        configurable: true,
      })
    }
    if (props.maxTouchPoints !== undefined) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: props.maxTouchPoints,
        configurable: true,
      })
    }
    if ('standalone' in props) {
      Object.defineProperty(window.navigator, 'standalone', {
        value: props.standalone,
        configurable: true,
      })
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      platform: 'Win32',
      maxTouchPoints: 0,
      standalone: false,
    })

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    setNavigatorProps({
      userAgent: originalUserAgent,
      platform: originalPlatform,
      maxTouchPoints: originalMaxTouchPoints,
      standalone: originalStandalone,
    })
    window.matchMedia = originalMatchMedia
  })

  it('deve disparar prompt() nativo, desabilitar botão durante instalação e exibir toast.success ao aceitar', async () => {
    let resolvePrompt: (() => void) | undefined
    const promptEvent = createBeforeInstallPromptEvent(
      'accepted',
      () =>
        new Promise<void>((resolve) => {
          resolvePrompt = resolve
        }),
    )

    render(<HeroSection onGoToLogin={vi.fn()} onExploreDemo={vi.fn()} />)

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    const pwaBtn = screen.getByTestId('welcome-pwa-btn')
    expect(pwaBtn.className).toMatch(/min-h-\[44px\]/)

    fireEvent.click(pwaBtn)

    expect(promptEvent.promptMock).toHaveBeenCalledTimes(1)
    expect(pwaBtn).toBeDisabled()

    await act(async () => {
      resolvePrompt?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Dinheirizz instalado com sucesso!')
    })
  })

  it('deve exibir toast.info quando o usuário cancelar o prompt nativo', async () => {
    const promptEvent = createBeforeInstallPromptEvent('dismissed')
    render(<HeroSection onGoToLogin={vi.fn()} />)

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('welcome-pwa-btn'))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Instalação cancelada. Você pode instalar quando quiser.',
      )
    })
  })

  it('deve abrir o guia iOS acessível no Safari iOS e permitir fechar por botão, Escape e backdrop', async () => {
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      standalone: false,
    })

    render(<HeroSection onGoToLogin={vi.fn()} />)

    fireEvent.click(screen.getByTestId('welcome-pwa-btn'))

    const dialog = await screen.findByTestId('pwa-ios-install-guide')
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'pwa-ios-install-title')
    expect(screen.getByText(/Compartilhar/i)).toBeInTheDocument()
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument()

    const closeBtn = screen.getByTestId('pwa-ios-guide-close-btn')
    expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
    expect(closeBtn).toHaveAttribute('aria-label', 'Fechar instruções de instalação')

    fireEvent.click(closeBtn)
    expect(screen.queryByTestId('pwa-ios-install-guide')).not.toBeInTheDocument()

    // Reabre e fecha com Escape
    fireEvent.click(screen.getByTestId('welcome-pwa-btn'))
    expect(await screen.findByTestId('pwa-ios-install-guide')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('pwa-ios-install-guide')).not.toBeInTheDocument()

    // Reabre e fecha clicando no backdrop
    fireEvent.click(screen.getByTestId('welcome-pwa-btn'))
    const reopenedDialog = await screen.findByTestId('pwa-ios-install-guide')
    fireEvent.click(reopenedDialog)
    expect(screen.queryByTestId('pwa-ios-install-guide')).not.toBeInTheDocument()
  })

  it('deve exibir estado "App já instalado" desabilitado quando em modo standalone', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<HeroSection onGoToLogin={vi.fn()} />)

    const pwaBtn = screen.getByTestId('welcome-pwa-btn')
    expect(pwaBtn).toBeDisabled()
    expect(pwaBtn).toHaveTextContent('App já instalado')
    expect(pwaBtn).toHaveAttribute('aria-label', 'Aplicativo Dinheirizz já instalado')
  })

  it('deve exibir toast informativo no cenário unsupported sem falhar silenciosamente', async () => {
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      standalone: false,
    })

    render(<HeroSection onGoToLogin={vi.fn()} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('welcome-pwa-btn'))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Instalação automática indisponível neste navegador. Use o menu do navegador para adicionar à tela inicial ou acesse pelo Chrome/Edge.',
      )
    })
  })
})
