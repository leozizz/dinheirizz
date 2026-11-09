import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

let mockUser: { id: string; email: string } | null = null

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      session: mockUser ? { access_token: 'fake-token' } : null,
      loading: false,
      signOut: vi.fn()
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('Import Statement Full Integration (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    global.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    }))
  })

  it('deve abrir modal de importação ao clicar na ação rápida Importar e no botão do Dashboard no modo demo', async () => {
    render(<App />, { wrapper: createWrapper() })

    // No modo inicial não autenticado, clica em Explorar Demonstração
    const exploreBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(exploreBtn)

    // Botão de Importar Extrato nas Ações Rápidas
    const quickImportBtn = screen.getByTestId('import-statement-btn')
    expect(quickImportBtn).toBeInTheDocument()

    // Clica para abrir modal
    fireEvent.click(quickImportBtn)
    expect(screen.getByTestId('import-statement-modal')).toBeInTheDocument()

    // Fecha o modal
    const closeBtn = screen.getByTestId('close-import-modal-btn')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('import-statement-modal')).not.toBeInTheDocument()
    })
  })

  it('deve realizar importação no Modo Demonstração sem autenticação e persistir no estado', async () => {
    render(<App />, { wrapper: createWrapper() })

    const exploreBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(exploreBtn)

    const quickImportBtn = screen.getByTestId('import-statement-btn')
    fireEvent.click(quickImportBtn)

    const csvContent = '10/10/2026;Venda Produto Demo;1200,00'
    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })
    const fileInput = screen.getByTestId('statement-file-input')

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-import-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('confirm-import-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('import-statement-modal')).not.toBeInTheDocument()
      expect(screen.getByText('Venda Produto Demo')).toBeInTheDocument()
    })
  })
})
