import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { LoginScreen } from '../components/auth/LoginScreen'

function TestConsumer() {
  const { user, signOut } = useAuth()
  if (!user) return <LoginScreen />
  return (
    <div>
      <p>Logado como: {user.email}</p>
      <button onClick={signOut}>Sair</button>
    </div>
  )
}

describe('Auth & LoginScreen with BFF-Driven Auth (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/v1/auth/login')) {
        const body = JSON.parse((init?.body as string) || '{}')
        if (body.email === 'errado@email.com') {
          return {
            ok: false,
            status: 401,
            json: async () => ({ error: 'Credenciais inválidas ou erro ao autenticar' })
          } as Response
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'mock-jwt-token',
            user: { id: 'user-1', email: 'teste@dinheirizz.com', fullName: 'Teste', username: 'teste' }
          })
        } as Response
      }

      if (typeof url === 'string' && url.includes('/api/v1/auth/me')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Não autorizado' })
        } as Response
      }

      if (typeof url === 'string' && url.includes('/api/v1/auth/logout')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as Response
    })
  })

  it('deve renderizar a tela de login com formulário e botões sociais quando deslogado', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByText('Dinheirizz')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
  })

  it('deve permitir alternar entre abas de Login e Cadastro', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const createAccountTab = screen.getByRole('button', { name: /criar conta/i })
    fireEvent.click(createAccountTab)

    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })

  it('deve disparar POST /api/v1/auth/login ao submeter formulário de login', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const emailInput = screen.getByPlaceholderText('seu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByTestId('auth-submit-btn')

    fireEvent.change(emailInput, { target: { value: 'teste@dinheirizz.com' } })
    fireEvent.change(passwordInput, { target: { value: 'senha123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"email":"teste@dinheirizz.com"')
        })
      )
    })
  })

  it('deve exibir botões sociais (Google e Apple) bloqueados com badge "Em breve" e desabilitados', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByRole('button', { name: /google/i })
    const appleBtn = screen.getByRole('button', { name: /apple/i })

    expect(googleBtn).toBeDisabled()
    expect(appleBtn).toBeDisabled()

    const badges = screen.getAllByText(/em breve/i)
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('deve exibir mensagem de erro quando o login falha', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'errado@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByTestId('auth-submit-btn'))

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas ou erro ao autenticar/i)).toBeInTheDocument()
    })
  })
})
