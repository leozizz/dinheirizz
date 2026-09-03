import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { LoginScreen } from '../components/auth/LoginScreen'

// Mock do supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn()
    }
  }
}))

import { supabase } from '../lib/supabase'

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

describe('Auth & LoginScreen (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    expect(screen.getByRole('button', { name: /entrar com google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar com apple/i })).toBeInTheDocument()
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

  it('deve disparar signInWithPassword ao submeter formulário de login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', email: 'teste@dinheirizz.com' } as any,
        session: {} as any
      },
      error: null
    })

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
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'teste@dinheirizz.com',
        password: 'senha123'
      })
    })
  })

  it('deve disparar signInWithOAuth ao clicar no botão do Google', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://oauth.google.com' },
      error: null
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByRole('button', { name: /entrar com google/i })
    fireEvent.click(googleBtn)

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object)
    })
  })

  it('deve exibir mensagem de erro quando o login falha', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' } as any
    })

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
