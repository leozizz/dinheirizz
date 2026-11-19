import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ThemeMode, ResolvedTheme, ThemeContextType } from '../types/theme'
import { encryptedStorageAdapter } from '../lib/encryptedStorage'
import { syncThemeIconsToDOM } from '../lib/themeIcons'

const THEME_STORAGE_KEY = 'dinheirizz:theme_mode'

export const ThemeContext = createContext<ThemeContextType | null>(null)

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

const applyThemeToDOM = (resolved: ResolvedTheme): void => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.setAttribute('data-theme', resolved)

  // Atualiza ou cria a meta tag theme-color
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', resolved === 'dark' ? '#0d0e12' : '#f8fafc')

  syncThemeIconsToDOM(resolved)
}

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeMode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark'
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(defaultTheme))
  const userOverrodeRef = useRef(false)

  // Carrega a preferência persistida no storage na montagem
  useEffect(() => {
    let isMounted = true

    const loadSavedTheme = async () => {
      try {
        const saved = await encryptedStorageAdapter.getItem(THEME_STORAGE_KEY)
        if (!isMounted || userOverrodeRef.current) return

        if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
          const validated = saved as ThemeMode
          setThemeState(validated)
          const resolved = resolveTheme(validated)
          setResolvedTheme(resolved)
          applyThemeToDOM(resolved)
        } else {
          applyThemeToDOM(resolveTheme(defaultTheme))
        }
      } catch {
        if (isMounted && !userOverrodeRef.current) {
          applyThemeToDOM(resolveTheme(defaultTheme))
        }
      }
    }

    void loadSavedTheme()

    return () => {
      isMounted = false
    }
  }, [defaultTheme])

  // Listener para mudança de preferência do sistema operacional quando em modo 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (theme === 'system') {
        const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(newResolved)
        applyThemeToDOM(newResolved)
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange)
    } else {
      // Fallback para navegadores legados
      mediaQuery.addListener(handleSystemChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange)
      } else {
        mediaQuery.removeListener(handleSystemChange)
      }
    }
  }, [theme])

  const setTheme = useCallback(async (newMode: ThemeMode): Promise<void> => {
    userOverrodeRef.current = true
    setThemeState(newMode)
    const resolved = resolveTheme(newMode)
    setResolvedTheme(resolved)
    applyThemeToDOM(resolved)

    try {
      await encryptedStorageAdapter.setItem(THEME_STORAGE_KEY, newMode)
    } catch {
      // Degradação graciosa
    }
  }, [])

  const toggleTheme = useCallback(async (): Promise<void> => {
    const nextMode: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark'
    await setTheme(nextMode)
  }, [resolvedTheme, setTheme])

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
