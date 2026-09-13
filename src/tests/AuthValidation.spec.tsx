import { describe, it, expect } from 'vitest'
import { signUpSchema, loginSchema } from '../schemas/auth'

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('deve validar credenciais válidas', () => {
      const result = loginSchema.safeParse({
        email: 'usuario@exemplo.com',
        password: 'Password123',
      })
      expect(result.success).toBe(true)
    })

    it('deve rejeitar email inválido', () => {
      const result = loginSchema.safeParse({
        email: 'email-invalido',
        password: 'Password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('E-mail inválido')
      }
    })

    it('deve rejeitar senha vazia', () => {
      const result = loginSchema.safeParse({
        email: 'usuario@exemplo.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('signUpSchema', () => {
    it('deve aceitar cadastro válido com todos os campos preenchidos', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        username: 'leozizz',
        email: 'leo@exemplo.com',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaForte123',
      })
      expect(result.success).toBe(true)
    })

    it('deve aceitar cadastro válido sem username (campo opcional)', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        email: 'leo@exemplo.com',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaForte123',
      })
      expect(result.success).toBe(true)
    })

    it('deve rejeitar quando as senhas não coincidem', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        email: 'leo@exemplo.com',
        password: 'SenhaForte123',
        confirmPassword: 'OutraSenha456',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmErr = result.error.errors.find((e) => e.path.includes('confirmPassword'))
        expect(confirmErr).toBeDefined()
        expect(confirmErr?.message).toContain('As senhas não coincidem')
      }
    })

    it('deve rejeitar senha com menos de 8 caracteres', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        email: 'leo@exemplo.com',
        password: 'Curta1',
        confirmPassword: 'Curta1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passErr = result.error.errors.find((e) => e.path.includes('password'))
        expect(passErr?.message).toContain('no mínimo 8 caracteres')
      }
    })

    it('deve rejeitar senha sem números', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        email: 'leo@exemplo.com',
        password: 'SenhaSemNumero',
        confirmPassword: 'SenhaSemNumero',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passErr = result.error.errors.find((e) => e.path.includes('password'))
        expect(passErr?.message).toContain('ao menos um número')
      }
    })

    it('deve rejeitar nome completo com menos de 3 caracteres', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Al',
        email: 'leo@exemplo.com',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaForte123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErr = result.error.errors.find((e) => e.path.includes('fullName'))
        expect(nameErr?.message).toContain('no mínimo 3 caracteres')
      }
    })

    it('deve rejeitar username com caracteres especiais inválidos ou maiúsculas', () => {
      const result = signUpSchema.safeParse({
        fullName: 'Leonardo Da Vinci',
        username: 'Leo_Zizz!',
        email: 'leo@exemplo.com',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaForte123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const userErr = result.error.errors.find((e) => e.path.includes('username'))
        expect(userErr).toBeDefined()
      }
    })
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider } from '../contexts/AuthContext'
import { LoginScreen } from '../components/auth/LoginScreen'
import { vi, beforeEach } from 'vitest'

describe('LoginScreen Enriched Signup Form (UI & UX)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/v1/auth/signup')) {
        const body = JSON.parse((init?.body as string) || '{}')
        if (body.email === 'duplicado@dinheirizz.com') {
          return {
            ok: false,
            status: 409,
            json: async () => ({ error: 'Este e-mail já está cadastrado.' })
          } as Response
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true, message: 'Cadastro realizado com sucesso.' })
        } as Response
      }

      return {
        ok: false,
        status: 401,
        json: async () => ({})
      } as Response
    })
  })

  it('deve renderizar campos de Nome Completo, Username e Confirmação de Senha ao alternar para Criar Conta', () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    const createTab = screen.getByTestId('tab-signup')
    fireEvent.click(createTab)

    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('seu_usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repita sua senha')).toBeInTheDocument()
  })

  it('deve exibir feedback dinâmico quando as senhas não coincidem e quando coincidem', () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    fireEvent.click(screen.getByTestId('tab-signup'))

    const passwordInput = screen.getByPlaceholderText('••••••••')
    const confirmInput = screen.getByPlaceholderText('Repita sua senha')

    fireEvent.change(passwordInput, { target: { value: 'SenhaForte123' } })
    fireEvent.change(confirmInput, { target: { value: 'SenhaDiferente' } })

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()

    fireEvent.change(confirmInput, { target: { value: 'SenhaForte123' } })
    expect(screen.getByText('As senhas coincidem')).toBeInTheDocument()
  })

  it('deve submeter o cadastro com sucesso repassando metadados de nome e username para /api/v1/auth/signup', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    fireEvent.click(screen.getByTestId('tab-signup'))

    fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), {
      target: { value: 'Leonardo Zizz' }
    })
    fireEvent.change(screen.getByPlaceholderText('seu_usuario'), {
      target: { value: 'leozizz' }
    })
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'leo@dinheirizz.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SenhaForte123' }
    })
    fireEvent.change(screen.getByPlaceholderText('Repita sua senha'), {
      target: { value: 'SenhaForte123' }
    })

    fireEvent.click(screen.getByTestId('auth-submit-btn'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"email":"leo@dinheirizz.com"')
        })
      )
    })
  })

  it('deve exibir aviso e alternar para login quando o e-mail já estiver cadastrado (duplicata)', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    )

    fireEvent.click(screen.getByTestId('tab-signup'))

    fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), { target: { value: 'João Repetido' } })
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'duplicado@dinheirizz.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'SenhaForte123' } })
    fireEvent.change(screen.getByPlaceholderText('Repita sua senha'), { target: { value: 'SenhaForte123' } })

    fireEvent.click(screen.getByTestId('auth-submit-btn'))

    await waitFor(() => {
      expect(screen.getByText(/este e-mail já está cadastrado/i)).toBeInTheDocument()
    })
  })
})

import { encryptedStorageAdapter } from '../lib/encryptedStorage'

describe('encryptedStorageAdapter (LocalStorage Encryption)', () => {
  it('deve armazenar dados criptografados no LocalStorage sem expor texto plano', async () => {
    const testKey = 'sb-test-token'
    const sensitivePayload = JSON.stringify({
      access_token: 'secret-token-12345',
      user: { email: 'usuario.secreto@dinheirizz.com', full_name: 'Usuário Secreto' }
    })

    await encryptedStorageAdapter.setItem(testKey, sensitivePayload)

    // O LocalStorage bruto NÃO deve conter a string sensível em texto plano
    const rawStorageValue = window.localStorage.getItem(testKey)
    expect(rawStorageValue).toBeDefined()
    expect(rawStorageValue?.startsWith('sb_enc:')).toBe(true)
    expect(rawStorageValue).not.toContain('secret-token-12345')
    expect(rawStorageValue).not.toContain('usuario.secreto@dinheirizz.com')

    // O adaptador deve descriptografar corretamente
    const decrypted = await encryptedStorageAdapter.getItem(testKey)
    expect(decrypted).toBe(sensitivePayload)

    // Remoção
    await encryptedStorageAdapter.removeItem(testKey)
    expect(window.localStorage.getItem(testKey)).toBeNull()
  })
})

