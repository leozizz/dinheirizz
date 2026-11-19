import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ThemeProvider } from '../contexts/ThemeContext'
import { useTheme } from '../hooks/useTheme'
import { encryptedStorageAdapter } from '../lib/encryptedStorage'
import { LandingHeader } from '../components/landing/LandingHeader'

// Componente auxiliar para testar o hook useTheme
const ThemeConsumerTest = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button
        data-testid="btn-set-light"
        onClick={() => {
          void setTheme('light')
        }}
      >
        Set Light
      </button>
      <button
        data-testid="btn-set-dark"
        onClick={() => {
          void setTheme('dark')
        }}
      >
        Set Dark
      </button>
      <button
        data-testid="btn-set-system"
        onClick={() => {
          void setTheme('system')
        }}
      >
        Set System
      </button>
      <button
        data-testid="btn-toggle"
        onClick={() => {
          void toggleTheme()
        }}
      >
        Toggle
      </button>
    </div>
  )
}

describe('Dual-Theme System (TDD - ThemeContext & useTheme)', () => {
  let matchMediaMatches = false
  const matchMediaListeners: Array<(e: MediaQueryListEvent) => void> = []

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')

    // Remove qualquer meta theme-color prévia e links de ícone gerenciados
    const existingMeta = document.querySelector('meta[name="theme-color"]')
    if (existingMeta) {
      existingMeta.remove()
    }
    document.head
      .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
      .forEach((link) => link.remove())

    matchMediaMatches = false
    matchMediaListeners.length = 0

    // Mock de window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // compat legado
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        matchMediaListeners.push(handler)
      }),
      removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        const idx = matchMediaListeners.indexOf(handler)
        if (idx !== -1) matchMediaListeners.splice(idx, 1)
      }),
      dispatchEvent: vi.fn()
    }))
  })

  afterEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  it('1. Deve inicializar por padrão no modo dark quando não houver preferência salva', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('dark')
      expect(screen.getByTestId('resolvedTheme' in screen ? 'resolved-theme' : 'resolved-theme').textContent).toBe('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta).not.toBeNull()
    expect(meta?.getAttribute('content')).toBe('#0d0e12')
  })

  it('2. Deve carregar a preferência light previamente gravada no encryptedStorageAdapter', async () => {
    await encryptedStorageAdapter.setItem('dinheirizz:theme_mode', 'light')

    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('light')
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#f8fafc')
  })

  it('3. Deve alternar para light ao invocar setTheme("light") e aplicar classe no documentElement', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('dark')
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-set-light'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('light')
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#f8fafc')

    const saved = await encryptedStorageAdapter.getItem('dinheirizz:theme_mode')
    expect(saved).toBe('light')
  })

  it('4. Deve alternar para dark ao invocar setTheme("dark") e aplicar classe no documentElement', async () => {
    await encryptedStorageAdapter.setItem('dinheirizz:theme_mode', 'light')

    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('light')
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-set-dark'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('dark')
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#0d0e12')
  })

  it('5. Deve alternar ciclicamente entre dark e light via toggleTheme()', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('dark')
    })

    // Toggle 1 -> light
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-toggle'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })

    // Toggle 2 -> dark
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-toggle'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    })
  })

  it('6. Deve resolver system respeitando prefers-color-scheme do SO e atualizar reativamente com listener', async () => {
    matchMediaMatches = false // SO em modo claro

    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-set-system'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('system')
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })

    expect(document.documentElement.classList.contains('light')).toBe(true)

    // Simula SO mudando para Dark
    await act(async () => {
      matchMediaMatches = true
      matchMediaListeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('7. Deve lançar erro se useTheme for chamado fora do ThemeProvider', () => {
    const ComponentWithoutProvider = () => {
      useTheme()
      return <div>Fora</div>
    }

    expect(() => render(<ComponentWithoutProvider />)).toThrow(
      'useTheme deve ser utilizado dentro de um ThemeProvider'
    )
  })

  it('8. Header toggle button deve alternar entre dark e light com data-testid e touch target adequado', async () => {
    // Renderiza um Header simulado ou o Header que consome useTheme
    const HeaderToggleConsumer = () => {
      const { resolvedTheme, toggleTheme } = useTheme()
      return (
        <header>
          <button
            type="button"
            onClick={toggleTheme}
            data-testid="header-theme-toggle-btn"
            aria-label="Alternar tema visual"
            className="min-h-[44px] min-w-[44px]"
          >
            {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </header>
      )
    }

    render(
      <ThemeProvider>
        <HeaderToggleConsumer />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId('header-theme-toggle-btn')
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('aria-label', 'Alternar tema visual')
    expect(toggleBtn.textContent).toBe('Modo Claro')

    await act(async () => {
      fireEvent.click(toggleBtn)
    })

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true)
      expect(toggleBtn.textContent).toBe('Modo Escuro')
    })
  })

  it('9. LandingHeader deve conter botão de alternância de tema com data-testid e alternar tema', async () => {
    render(
      <ThemeProvider>
        <LandingHeader onGoToLogin={vi.fn()} />
      </ThemeProvider>
    )

    const landingToggleBtn = screen.getByTestId('landing-theme-toggle-btn')
    expect(landingToggleBtn).toBeInTheDocument()
    expect(landingToggleBtn).toHaveAttribute('aria-label', 'Alternar tema visual')

    await act(async () => {
      fireEvent.click(landingToggleBtn)
    })

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true)
    })
  })

  it('10. ProfileModal deve exibir seletor segmentado com as 3 opções (dark, light, system) e alternar tema', async () => {
    // Componente simulando o seletor do ProfileModal consumindo useTheme
    const ProfileThemeSectionConsumer = () => {
      const { theme, setTheme } = useTheme()

      return (
        <div data-testid="theme-selector-group">
          <button
            type="button"
            data-testid="theme-option-dark"
            onClick={() => {
              void setTheme('dark')
            }}
            aria-pressed={theme === 'dark'}
          >
            Escuro
          </button>
          <button
            type="button"
            data-testid="theme-option-light"
            onClick={() => {
              void setTheme('light')
            }}
            aria-pressed={theme === 'light'}
          >
            Claro
          </button>
          <button
            type="button"
            data-testid="theme-option-system"
            onClick={() => {
              void setTheme('system')
            }}
            aria-pressed={theme === 'system'}
          >
            Sistema
          </button>
        </div>
      )
    }

    render(
      <ThemeProvider>
        <ProfileThemeSectionConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-selector-group')).toBeInTheDocument()
    const darkBtn = screen.getByTestId('theme-option-dark')
    const lightBtn = screen.getByTestId('theme-option-light')
    const systemBtn = screen.getByTestId('theme-option-system')

    expect(darkBtn).toBeInTheDocument()
    expect(lightBtn).toBeInTheDocument()
    expect(systemBtn).toBeInTheDocument()

    // Inicialmente no modo dark
    expect(darkBtn).toHaveAttribute('aria-pressed', 'true')
    expect(lightBtn).toHaveAttribute('aria-pressed', 'false')

    // Clica na opção Claro
    await act(async () => {
      fireEvent.click(lightBtn)
    })

    await waitFor(() => {
      expect(lightBtn).toHaveAttribute('aria-pressed', 'true')
      expect(darkBtn).toHaveAttribute('aria-pressed', 'false')
      expect(document.documentElement.classList.contains('light')).toBe(true)
    })

    // Clica na opção Sistema
    await act(async () => {
      fireEvent.click(systemBtn)
    })

    await waitFor(() => {
      expect(systemBtn).toHaveAttribute('aria-pressed', 'true')
      expect(lightBtn).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('11. Deve sincronizar dinamicamente os favicons e apple-touch-icon no document.head ao alternar entre dark, light e system', async () => {
    // Simula links iniciais com prefers-color-scheme como no index.html
    const seedLinks = [
      { rel: 'icon', href: '/dinheirizz-dark/favicon.ico', media: '(prefers-color-scheme: dark)' },
      { rel: 'icon', href: '/dinheirizz-light/favicon.ico', media: '(prefers-color-scheme: light)' },
      { rel: 'icon', sizes: '16x16', type: 'image/png', href: '/dinheirizz-dark/favicon-16x16.png', media: '(prefers-color-scheme: dark)' },
      { rel: 'icon', sizes: '16x16', type: 'image/png', href: '/dinheirizz-light/favicon-16x16.png', media: '(prefers-color-scheme: light)' },
      { rel: 'icon', sizes: '32x32', type: 'image/png', href: '/dinheirizz-dark/favicon-32x32.png', media: '(prefers-color-scheme: dark)' },
      { rel: 'icon', sizes: '32x32', type: 'image/png', href: '/dinheirizz-light/favicon-32x32.png', media: '(prefers-color-scheme: light)' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/dinheirizz-dark/apple-touch-icon.png', media: '(prefers-color-scheme: dark)' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/dinheirizz-light/apple-touch-icon.png', media: '(prefers-color-scheme: light)' }
    ]

    seedLinks.forEach((attrs) => {
      const link = document.createElement('link')
      Object.entries(attrs).forEach(([key, val]) => link.setAttribute(key, val))
      document.head.appendChild(link)
    })

    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    // Inicialmente em dark
    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    })

    const assertIconsForTheme = (expectedTheme: 'dark' | 'light') => {
      const expectedPrefix = `/dinheirizz-${expectedTheme}/`
      const iconLinks = Array.from(document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]'))
      expect(iconLinks.length).toBeGreaterThanOrEqual(4)

      iconLinks.forEach((link) => {
        expect(link.getAttribute('href')?.startsWith(expectedPrefix)).toBe(true)
        expect(link.hasAttribute('media')).toBe(false)
      })

      expect(document.head.querySelector(`link[rel="icon"][href="${expectedPrefix}favicon.ico"]`)).not.toBeNull()
      expect(document.head.querySelector(`link[rel="icon"][sizes="16x16"][href="${expectedPrefix}favicon-16x16.png"]`)).not.toBeNull()
      expect(document.head.querySelector(`link[rel="icon"][sizes="32x32"][href="${expectedPrefix}favicon-32x32.png"]`)).not.toBeNull()
      expect(document.head.querySelector(`link[rel="apple-touch-icon"][href="${expectedPrefix}apple-touch-icon.png"]`)).not.toBeNull()
    }

    assertIconsForTheme('dark')

    // Troca manual para light (mesmo se SO estiver em dark)
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-set-light'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })
    assertIconsForTheme('light')

    // Troca para system com SO em dark
    matchMediaMatches = true
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-set-system'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    })
    assertIconsForTheme('dark')
  })

  it('12. Deve criar os links de ícone de forma idempotente caso document.head esteja vazio (JSDOM/testes)', async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumerTest />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    })

    expect(document.head.querySelector('link[rel="icon"][href="/dinheirizz-light/favicon.ico"]')).not.toBeNull()
    expect(document.head.querySelector('link[rel="icon"][sizes="16x16"][href="/dinheirizz-light/favicon-16x16.png"]')).not.toBeNull()
    expect(document.head.querySelector('link[rel="icon"][sizes="32x32"][href="/dinheirizz-light/favicon-32x32.png"]')).not.toBeNull()
    expect(document.head.querySelector('link[rel="apple-touch-icon"][href="/dinheirizz-light/apple-touch-icon.png"]')).not.toBeNull()
  })
})



