import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { LoginScreen } from '../components/auth/LoginScreen'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}))

const TestConsumer = () => {
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

    // Configuração padrão dos mocks do Supabase
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2' },
      error: null
    })
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null
    })

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

      if (typeof url === 'string' && url.includes('/api/v1/auth/signup')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            message: 'Cadastro realizado com sucesso.'
          })
        } as Response
      }

      if (typeof url === 'string' && url.includes('/api/v1/users/sync')) {
        const body = JSON.parse((init?.body as string) || '{}')
        const isApple = body.provider === 'apple'
        return {
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: isApple ? 'apple-user-999' : 'google-user-123',
              email: isApple ? 'usuario.apple@privaterelay.appleid.com' : 'usuario.google@gmail.com',
              fullName: body.fullName ?? (isApple ? 'Usuário Apple' : 'Usuário Google'),
              username: null,
              avatarUrl: body.avatarUrl ?? null,
              provider: isApple ? 'apple' : 'google',
              providers: isApple ? ['apple'] : ['google']
            }
          })
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

  it('deve renderizar a tela de login com botões Google e Apple habilitados e acessíveis', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByTestId('oauth-google-btn')
    const appleBtn = screen.getByTestId('oauth-apple-btn')

    expect(googleBtn).not.toBeDisabled()
    expect(googleBtn).toHaveAttribute('aria-label', 'Entrar com conta Google')
    expect(googleBtn.textContent).not.toContain('Em breve')

    expect(appleBtn).not.toBeDisabled()
    expect(appleBtn).not.toHaveAttribute('aria-disabled', 'true')
    expect(appleBtn).toHaveAttribute('aria-label', 'Entrar com conta Apple')
    expect(appleBtn.textContent).not.toContain('Em breve')
  })

  it('deve invocar signInWithOAuth com provedor "apple" ao clicar no botão da Apple', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const appleBtn = screen.getByTestId('oauth-apple-btn')
    fireEvent.click(appleBtn)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin
        }
      })
    })
  })

  it('deve exibir mensagem de erro quando signInWithOAuth com Apple falha', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'apple', url: null },
      error: new AuthError('Sign in with Apple popup closed', 400, 'popup_closed')
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const appleBtn = screen.getByTestId('oauth-apple-btn')
    fireEvent.click(appleBtn)

    await waitFor(() => {
      expect(screen.getByText(/Sign in with Apple popup closed/i)).toBeInTheDocument()
    })
  })

  it('deve invocar signInWithOAuth com provedor "google" ao clicar no botão do Google', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByTestId('oauth-google-btn')
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      })
    })
  })

  it('deve exibir mensagem de erro quando signInWithOAuth falha', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: null },
      error: new AuthError('Popup blocked by browser', 400, 'popup_closed')
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByTestId('oauth-google-btn')
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(screen.getByText(/Popup blocked by browser/i)).toBeInTheDocument()
    })
  })

  it('deve sincronizar usuário com BFF e persistir sessão após retorno do Google OAuth', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    window.location.hash = '#access_token=google-access-token&token_type=bearer'

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'google-oauth-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'google-refresh-token',
          user: {
            id: 'google-user-123',
            email: 'usuario.google@gmail.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              full_name: 'Usuário Google',
              avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg'
            },
            aud: 'authenticated',
            created_at: '2026-11-06T20:00:00.000Z'
          }
        } as unknown as Session
      },
      error: null
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/sync'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer google-oauth-access-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            fullName: 'Usuário Google',
            avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
            provider: 'google'
          })
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Logado como: usuario.google@gmail.com/i)).toBeInTheDocument()
    })

    expect(replaceStateSpy).toHaveBeenCalled()
    replaceStateSpy.mockRestore()
  })

  it('deve sincronizar usuário Apple com BFF (incluindo Private Relay) e persistir sessão após retorno do OAuth', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    window.location.hash = '#access_token=apple-access-token&token_type=bearer'

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'apple-oauth-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'apple-refresh-token',
          user: {
            id: 'apple-user-999',
            email: 'usuario.apple@privaterelay.appleid.com',
            app_metadata: { provider: 'apple', providers: ['apple'] },
            user_metadata: {
              full_name: 'Usuário Apple'
            },
            aud: 'authenticated',
            created_at: '2026-11-06T20:00:00.000Z'
          }
        } as unknown as Session
      },
      error: null
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/sync'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer apple-oauth-access-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            fullName: 'Usuário Apple',
            provider: 'apple'
          })
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Logado como: usuario.apple@privaterelay.appleid.com/i)).toBeInTheDocument()
    })

    expect(replaceStateSpy).toHaveBeenCalled()
    replaceStateSpy.mockRestore()
  })

  it('deve revogar sessão no Supabase e no BFF ao executar signOut', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'google-oauth-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'google-refresh-token',
          user: {
            id: 'google-user-123',
            email: 'usuario.google@gmail.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: { full_name: 'Usuário Google' },
            aud: 'authenticated',
            created_at: '2026-11-06T20:00:00.000Z'
          }
        } as unknown as Session
      },
      error: null
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Logado como: usuario.google@gmail.com/i)).toBeInTheDocument()
    })

    const logoutBtn = screen.getByRole('button', { name: /sair/i })
    fireEvent.click(logoutBtn)

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(screen.getByText('Dinheirizz')).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro quando o login com senha falha', async () => {
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

  it('deve abrir o modal de verificação OTP ao realizar cadastro com sucesso', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const createAccountTab = screen.getByRole('button', { name: /criar conta/i })
    fireEvent.click(createAccountTab)

    fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), { target: { value: 'Novo Usuário' } })
    fireEvent.change(screen.getByPlaceholderText('seu_usuario'), { target: { value: 'novousuario' } })
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'novo@dinheirizz.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'SenhaForte123!' } })
    fireEvent.change(screen.getByPlaceholderText('Repita sua senha'), { target: { value: 'SenhaForte123!' } })

    const submitBtn = screen.getByTestId('auth-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByTestId('email-verification-modal')).toBeInTheDocument()
      expect(screen.getByText('novo@dinheirizz.com')).toBeInTheDocument()
    })
  })
})
