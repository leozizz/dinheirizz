import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePwaInstall, type BeforeInstallPromptEvent } from '../hooks/usePwaInstall'

interface MutableNavigator {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone?: boolean
}

const createBeforeInstallPromptEvent = (
  outcome: 'accepted' | 'dismissed' = 'accepted',
  promptImpl?: () => Promise<void>,
): BeforeInstallPromptEvent & { preventDefaultMock: ReturnType<typeof vi.fn>; promptMock: ReturnType<typeof vi.fn> } => {
  const preventDefaultMock = vi.fn()
  const promptMock = vi.fn(promptImpl ?? (async () => undefined))
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent & {
    preventDefaultMock: ReturnType<typeof vi.fn>
    promptMock: ReturnType<typeof vi.fn>
  }

  Object.defineProperty(event, 'preventDefault', {
    value: preventDefaultMock,
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
  event.preventDefaultMock = preventDefaultMock
  event.promptMock = promptMock

  return event
}

describe('usePwaInstall', () => {
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
    vi.restoreAllMocks()
  })

  it('deve capturar beforeinstallprompt, chamar preventDefault e resolver accepted', async () => {
    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.canInstallNatively).toBe(false)
    expect(result.current.isInstalled).toBe(false)

    const promptEvent = createBeforeInstallPromptEvent('accepted')

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    expect(promptEvent.preventDefaultMock).toHaveBeenCalledTimes(1)
    expect(result.current.canInstallNatively).toBe(true)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(promptEvent.promptMock).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('accepted')
    expect(result.current.canInstallNatively).toBe(false)
    expect(result.current.isInstalled).toBe(true)
  })

  it('deve resolver dismissed quando o usuário recusa o prompt nativo', async () => {
    const { result } = renderHook(() => usePwaInstall())
    const promptEvent = createBeforeInstallPromptEvent('dismissed')

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(promptEvent.promptMock).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('dismissed')
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.canInstallNatively).toBe(false)
  })

  it('deve atualizar isInstalled para true e limpar deferredPrompt ao disparar appinstalled', () => {
    const { result } = renderHook(() => usePwaInstall())
    const promptEvent = createBeforeInstallPromptEvent('accepted')

    act(() => {
      window.dispatchEvent(promptEvent)
    })
    expect(result.current.canInstallNatively).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstallNatively).toBe(false)
  })

  it('deve detectar modo standalone via matchMedia e retornar already-installed', async () => {
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

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isInstalled).toBe(true)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(outcome).toBe('already-installed')
  })

  it('deve funcionar com fallback seguro quando matchMedia não possui addEventListener', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })) as unknown as typeof window.matchMedia

    const { result, unmount } = renderHook(() => usePwaInstall())
    expect(result.current.isInstalled).toBe(false)
    expect(() => unmount()).not.toThrow()
  })

  it('deve detectar modo standalone via navigator.standalone no iOS', async () => {
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      standalone: true,
    })

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.isIos).toBe(false)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(outcome).toBe('already-installed')
  })

  it('deve detectar iPhone/iPad/iPadOS sem beforeinstallprompt e retornar ios-guide', async () => {
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      standalone: false,
    })

    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.isIos).toBe(true)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })
    expect(outcome).toBe('ios-guide')

    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      standalone: false,
    })

    const { result: ipadResult } = renderHook(() => usePwaInstall())
    expect(ipadResult.current.isIos).toBe(true)
  })

  it('deve retornar unsupported em navegador desktop sem beforeinstallprompt e não-iOS', async () => {
    setNavigatorProps({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    })

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isIos).toBe(false)
    expect(result.current.canInstallNatively).toBe(false)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(outcome).toBe('unsupported')
  })

  it('deve responder ao evento dinheirizz:install-pwa sem disparo duplicado', async () => {
    const { result } = renderHook(() => usePwaInstall())
    const promptEvent = createBeforeInstallPromptEvent('accepted')

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dinheirizz:install-pwa'))
      await Promise.resolve()
    })

    expect(promptEvent.promptMock).toHaveBeenCalledTimes(1)
    expect(result.current.isInstalled).toBe(true)
  })

  it('deve proteger contra rejeição em prompt() e resetar isInstalling', async () => {
    const { result } = renderHook(() => usePwaInstall())
    const failingPrompt = createBeforeInstallPromptEvent('dismissed', async () => {
      throw new Error('Prompt failed')
    })

    act(() => {
      window.dispatchEvent(failingPrompt)
    })

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(outcome).toBe('unsupported')
    expect(result.current.isInstalling).toBe(false)
  })
})
