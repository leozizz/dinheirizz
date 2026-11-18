import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PwaUpdatePrompt } from '../components/pwa/PwaUpdatePrompt'

const mockUpdateServiceWorker = vi.fn()
const mockSetNeedRefresh = vi.fn()
const mockSetOfflineReady = vi.fn()

let mockNeedRefreshState = false

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: {
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }) => {
    if (options?.onRegisterError) {
      options.onRegisterError(undefined)
    }
    return {
      needRefresh: [mockNeedRefreshState, mockSetNeedRefresh],
      offlineReady: [false, mockSetOfflineReady],
      updateServiceWorker: mockUpdateServiceWorker
    }
  }
}))

describe('PwaUpdatePrompt Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNeedRefreshState = false
    mockUpdateServiceWorker.mockResolvedValue(undefined)
  })

  it('não deve renderizar o banner quando needRefresh for false', () => {
    mockNeedRefreshState = false
    render(<PwaUpdatePrompt />)
    expect(screen.queryByTestId('pwa-update-banner')).not.toBeInTheDocument()
  })

  it('deve renderizar o banner acessível com título, descrição e botões quando needRefresh for true', () => {
    mockNeedRefreshState = true
    render(<PwaUpdatePrompt />)

    const banner = screen.getByTestId('pwa-update-banner')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveAttribute('role', 'status')
    expect(banner).toHaveAttribute('aria-live', 'polite')

    expect(screen.getByText(/nova versão disponível/i)).toBeInTheDocument()
    expect(screen.getByText(/atualize o dinheirizz/i)).toBeInTheDocument()

    const confirmBtn = screen.getByTestId('pwa-update-confirm-btn')
    const dismissBtn = screen.getByTestId('pwa-update-dismiss-btn')

    expect(confirmBtn).toBeInTheDocument()
    expect(dismissBtn).toBeInTheDocument()
    expect(confirmBtn.className).toContain('min-h-[44px]')
    expect(dismissBtn.className).toContain('min-h-[44px]')
  })

  it('deve chamar updateServiceWorker(true) e entrar em estado disabled/loading ao clicar em Atualizar agora', async () => {
    mockNeedRefreshState = true
    let resolveUpdate: (() => void) | undefined
    mockUpdateServiceWorker.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve
        })
    )

    render(<PwaUpdatePrompt />)

    const confirmBtn = screen.getByTestId('pwa-update-confirm-btn')
    fireEvent.click(confirmBtn)

    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true)
    expect(confirmBtn).toBeDisabled()

    if (resolveUpdate) {
      resolveUpdate()
    }

    await waitFor(() => {
      expect(mockUpdateServiceWorker).toHaveBeenCalledTimes(1)
    })
  })

  it('deve chamar setNeedRefresh(false) ao clicar em Depois', () => {
    mockNeedRefreshState = true
    render(<PwaUpdatePrompt />)

    const dismissBtn = screen.getByTestId('pwa-update-dismiss-btn')
    fireEvent.click(dismissBtn)

    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false)
  })
})
