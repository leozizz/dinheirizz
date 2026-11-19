import { useCallback, useEffect, useRef, useState } from 'react'

export type PwaInstallOutcome =
  | 'accepted'
  | 'dismissed'
  | 'ios-guide'
  | 'already-installed'
  | 'unsupported'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

export interface UsePwaInstallReturn {
  canInstallNatively: boolean
  isInstalled: boolean
  isIos: boolean
  isInstalling: boolean
  triggerInstall: () => Promise<PwaInstallOutcome>
}

const STANDALONE_MEDIA_QUERY = '(display-mode: standalone)'
const IOS_USER_AGENT_REGEX = /iPhone|iPad|iPod/i

const checkIsStandalone = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  const nav = window.navigator as NavigatorStandalone
  if (nav.standalone === true) {
    return true
  }

  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(STANDALONE_MEDIA_QUERY).matches
  }

  return false
}

const checkIsIos = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  const { userAgent, platform, maxTouchPoints } = window.navigator
  if (IOS_USER_AGENT_REGEX.test(userAgent)) {
    return true
  }

  return platform === 'MacIntel' && maxTouchPoints > 1
}

/**
 * Gerencia a captura do evento `beforeinstallprompt`, detecção de modo standalone,
 * identificação de Safari/iOS e disparo controlado da instalação da PWA.
 */
export const usePwaInstall = (): UsePwaInstallReturn => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone())
  const [isInstalling, setIsInstalling] = useState<boolean>(false)
  const [isIosDevice, setIsIosDevice] = useState<boolean>(() => checkIsIos())
  const isInstallingRef = useRef<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setIsInstalled(checkIsStandalone())
    setIsIosDevice(checkIsIos())

    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = (): void => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    const mediaQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia(STANDALONE_MEDIA_QUERY) : null

    const handleDisplayModeChange = (event: MediaQueryListEvent): void => {
      if (event.matches) {
        setIsInstalled(true)
        setDeferredPrompt(null)
      }
    }

    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      }
    }
  }, [])

  const triggerInstall = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (isInstalled || checkIsStandalone()) {
      setIsInstalled(true)
      return 'already-installed'
    }

    if (deferredPrompt) {
      if (isInstallingRef.current) {
        return 'unsupported'
      }

      isInstallingRef.current = true
      setIsInstalling(true)
      try {
        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        setDeferredPrompt(null)
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true)
          return 'accepted'
        }
        return 'dismissed'
      } catch {
        setDeferredPrompt(null)
        return 'unsupported'
      } finally {
        isInstallingRef.current = false
        setIsInstalling(false)
      }
    }

    if (isIosDevice) {
      return 'ios-guide'
    }

    return 'unsupported'
  }, [deferredPrompt, isInstalled, isIosDevice])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleExternalInstallEvent = (): void => {
      if (isInstallingRef.current) {
        return
      }
      void triggerInstall()
    }

    window.addEventListener('dinheirizz:install-pwa', handleExternalInstallEvent)
    return () => {
      window.removeEventListener('dinheirizz:install-pwa', handleExternalInstallEvent)
    }
  }, [triggerInstall])

  const isIos = isIosDevice && !isInstalled
  const canInstallNatively = deferredPrompt !== null && !isInstalled

  return {
    canInstallNatively,
    isInstalled,
    isIos,
    isInstalling,
    triggerInstall,
  }
}
