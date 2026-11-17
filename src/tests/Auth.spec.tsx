import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { LoginScreen } from '../components/auth/LoginScreen'

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

describe('Auth & LoginScreen with BFF-Driven Auth (Zero Frontend Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''

      if (urlStr.includes('/api/v1/auth/login')) {
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

      if (urlStr.includes('/api/v1/auth/me')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Não autorizado' })
        } as Response
      }

      if (urlStr.includes('/api/v1/auth/logout')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response
      }

      if (urlStr.includes('/api/v1/auth/signup')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            message: 'Cadastro realizado com sucesso.'
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/auth/oauth/google')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            url: 'https://auth.dinheirizz.com/oauth/google'
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/auth/oauth/apple')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            url: 'https://auth.dinheirizz.com/oauth/apple'
          })
        } as Response
      }

      if (urlStr.includes('/api/v1/auth/oauth/session')) {
        const body = JSON.parse((init?.body as string) || '{}')
        const isApple = body.provider === 'apple'
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'mock-jwt-token-oauth',
            user: {
              id: isApple ? 'apple-user-999' : 'google-user-123',
              email: isApple ? 'usuario.apple@privaterelay.appleid.com' : 'usuario.google@gmail.com',
              fullName: isApple ? 'Usuário Apple' : 'Usuário Google',
              username: null,
              avatarUrl: isApple ? null : 'https://lh3.googleusercontent.com/avatar.jpg',
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

  it('deve renderizar os botões Google e Apple bloqueados com indicação "Em breve" e acessíveis', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByTestId('oauth-google-btn')
    const appleBtn = screen.getByTestId('oauth-apple-btn')

    expect(googleBtn).toBeDisabled()
    expect(googleBtn).toHaveAttribute('aria-disabled', 'true')
    expect(googleBtn).toHaveAttribute('aria-label', 'Entrar com conta Google — Em breve')
    expect(googleBtn.textContent).toContain('Em breve')

    expect(appleBtn).toBeDisabled()
    expect(appleBtn).toHaveAttribute('aria-disabled', 'true')
    expect(appleBtn).toHaveAttribute('aria-label', 'Entrar com conta Apple — Em breve')
    expect(appleBtn.textContent).toContain('Em breve')
  })

  it('não deve disparar requisição OAuth ao clicar nos botões Google ou Apple bloqueados', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const googleBtn = screen.getByTestId('oauth-google-btn')
    const appleBtn = screen.getByTestId('oauth-apple-btn')

    fireEvent.click(googleBtn)
    fireEvent.click(appleBtn)

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))
      expect(fetchCalls.some((url) => url.includes('/api/v1/auth/oauth/google'))).toBe(false)
      expect(fetchCalls.some((url) => url.includes('/api/v1/auth/oauth/apple'))).toBe(false)
    })
  })

  it('deve trocar token retornado na URL por sessão BFF e persistir sessão', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    window.location.hash = '#access_token=google-oauth-access-token&provider=google'

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/oauth/session'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            access_token: 'google-oauth-access-token',
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
    window.location.hash = ''
  })

  it('deve encerrar sessão via BFF ao executar signOut', async () => {
    window.location.hash = '#access_token=google-oauth-access-token&provider=google'

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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(screen.getByText('Dinheirizz')).toBeInTheDocument()
    })
    window.location.hash = ''
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
