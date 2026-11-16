import React, { createContext, useContext, useEffect, useState } from 'react'
import { hashPasswordClient } from '../lib/crypto'
import { encryptedStorageAdapter } from '../lib/encryptedStorage'

export interface AuthUser {
  id: string
  email: string
  fullName?: string | null
  username?: string | null
  avatarUrl?: string | null
  provider?: string
  providers?: string[]
  user_metadata?: {
    full_name?: string | null
    username?: string | null
    email?: string
  }
}

export interface AuthSession {
  access_token: string
  user: AuthUser
}

export interface AuthError {
  message: string
}

export interface SignUpResult {
  error: AuthError | null
  user: AuthUser | null
  session: AuthSession | null
  isDuplicate: boolean
}

export interface SignInResult {
  error: AuthError | null
  user: AuthUser | null
  session: AuthSession | null
}

export interface VerifyEmailResult {
  success: boolean
  message: string
  error?: string
}

export interface ResendVerificationResult {
  success: boolean
  message: string
  error?: string
}

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<SignInResult>
  signUp: (credentials: {
    email: string
    password: string
    fullName?: string
    username?: string
  }) => Promise<SignUpResult>
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  verifyEmail: (email: string, token: string) => Promise<VerifyEmailResult>
  resendVerification: (email: string) => Promise<ResendVerificationResult>
  updateUser: (updatedData: Partial<AuthUser>) => void
}

const STORAGE_SESSION_KEY = 'dinheirizz_auth_session'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const origin = getApiOrigin()

        // 1. Verifica se há retorno de autenticação OAuth na URL (#access_token ou ?code)
        if (typeof window !== 'undefined') {
          const hash = window.location.hash || ''
          const search = window.location.search || ''
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
          const searchParams = new URLSearchParams(search)

          const oauthToken = hashParams.get('access_token') || searchParams.get('access_token')
          const oauthProvider = hashParams.get('provider') || searchParams.get('provider') || 'oauth'

          if (oauthToken) {
            const res = await fetch(`${origin}/api/v1/auth/oauth/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: oauthToken, provider: oauthProvider })
            }).catch(() => null)

            if (res && res.ok) {
              const data = await res.json()
              const authUser: AuthUser = {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName ?? null,
                username: data.user.username ?? null,
                avatarUrl: data.user.avatarUrl ?? null,
                provider: data.user.provider || oauthProvider,
                providers: data.user.providers || [oauthProvider],
                user_metadata: {
                  full_name: data.user.fullName ?? null,
                  username: data.user.username ?? null,
                  email: data.user.email
                }
              }
              const authSession: AuthSession = {
                access_token: data.token,
                user: authUser
              }

              await encryptedStorageAdapter.setItem(
                STORAGE_SESSION_KEY,
                JSON.stringify({ token: data.token, user: authUser })
              )

              setUser(authUser)
              setSession(authSession)

              // Higienização de URL
              if (window.history?.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname || '/')
              }

              setLoading(false)
              return
            }
          }
        }

        // 2. Verificação de sessão salva em encryptedStorage
        const stored = await encryptedStorageAdapter.getItem(STORAGE_SESSION_KEY)
        if (!stored) {
          setLoading(false)
          return
        }

        const parsed = JSON.parse(stored) as { token?: string; user?: AuthUser } | null
        if (!parsed || !parsed.token) {
          setLoading(false)
          return
        }

        // Validação da sessão contra o BFF /api/v1/auth/me
        const res = await fetch(`${origin}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${parsed.token}`
          }
        }).catch(() => null)

        if (res && res.ok) {
          const data = await res.json()
          const validUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName ?? null,
            username: data.user.username ?? null,
            avatarUrl: data.user.avatarUrl ?? null,
            provider: data.user.provider ?? undefined,
            providers: data.user.providers ?? undefined,
            user_metadata: {
              full_name: data.user.fullName ?? null,
              username: data.user.username ?? null,
              email: data.user.email
            }
          }
          const validSession: AuthSession = {
            access_token: parsed.token,
            user: validUser
          }
          setUser(validUser)
          setSession(validSession)
        } else if (res && res.status === 401) {
          // Token expirado ou inválido
          await encryptedStorageAdapter.removeItem(STORAGE_SESSION_KEY)
          setUser(null)
          setSession(null)
        } else if (parsed.user) {
          // Mantém sessão local em modo offline
          setUser(parsed.user)
          setSession({ access_token: parsed.token, user: parsed.user })
        }
      } catch {
        // Ignora erros de desserialização
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const signInWithPassword = async ({
    email,
    password
  }: {
    email: string
    password: string
  }): Promise<SignInResult> => {
    try {
      const hashedPassword = await hashPasswordClient(password)
      const origin = getApiOrigin()

      const res = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: hashedPassword
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        return {
          error: { message: data.error || 'E-mail ou senha incorretos' },
          user: null,
          session: null
        }
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName ?? null,
        username: data.user.username ?? null,
        avatarUrl: data.user.avatarUrl ?? null,
        provider: data.user.provider ?? undefined,
        providers: data.user.providers ?? undefined,
        user_metadata: {
          full_name: data.user.fullName ?? null,
          username: data.user.username ?? null,
          email: data.user.email
        }
      }

      const authSession: AuthSession = {
        access_token: data.token,
        user: authUser
      }

      await encryptedStorageAdapter.setItem(
        STORAGE_SESSION_KEY,
        JSON.stringify({ token: data.token, user: authUser })
      )

      setUser(authUser)
      setSession(authSession)

      return { error: null, user: authUser, session: authSession }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor'
      return {
        error: { message: msg },
        user: null,
        session: null
      }
    }
  }

  const signUp = async ({
    email,
    password,
    fullName,
    username
  }: {
    email: string
    password: string
    fullName?: string
    username?: string
  }): Promise<SignUpResult> => {
    try {
      const hashedPassword = await hashPasswordClient(password)
      const origin = getApiOrigin()

      const res = await fetch(`${origin}/api/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          fullName: fullName?.trim() || undefined,
          username: username?.trim().toLowerCase() || undefined
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        return {
          error: { message: data.error || 'Este e-mail já está cadastrado.' },
          user: null,
          session: null,
          isDuplicate: true
        }
      }

      if (!res.ok) {
        return {
          error: { message: data.error || 'Erro ao realizar cadastro' },
          user: null,
          session: null,
          isDuplicate: false
        }
      }

      return {
        error: null,
        user: null,
        session: null,
        isDuplicate: false
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor'
      return {
        error: { message: msg },
        user: null,
        session: null,
        isDuplicate: false
      }
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'apple'): Promise<{ error: AuthError | null }> => {
    try {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/auth/oauth/${provider}?redirectTo=${encodeURIComponent(origin)}`)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { error: { message: data.error || 'Falha ao iniciar autenticação OAuth' } }
      }

      const data = await res.json()
      if (data.url && typeof window !== 'undefined') {
        window.location.href = data.url
      }

      return { error: null }
    } catch (err: unknown) {
      const providerLabel = provider === 'apple' ? 'Apple' : 'Google'
      const msg = err instanceof Error ? err.message : `Falha ao iniciar autenticação com ${providerLabel}`
      return { error: { message: msg } }
    }
  }

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const origin = getApiOrigin()
      await fetch(`${origin}/api/v1/auth/logout`, { method: 'POST' }).catch(() => {})
      await encryptedStorageAdapter.removeItem(STORAGE_SESSION_KEY)
      setSession(null)
      setUser(null)
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao deslogar'
      return { error: { message: msg } }
    }
  }

  const verifyEmail = async (email: string, token: string): Promise<VerifyEmailResult> => {
    try {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; success?: boolean }
      if (!res.ok) {
        const msg = data.error || data.message || 'Código de verificação inválido ou expirado.'
        return {
          success: false,
          message: msg,
          error: msg
        }
      }
      return {
        success: true,
        message: data.message || 'E-mail verificado com sucesso.'
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao verificar e-mail'
      return {
        success: false,
        message: msg,
        error: msg
      }
    }
  }

  const resendVerification = async (email: string): Promise<ResendVerificationResult> => {
    try {
      const origin = getApiOrigin()
      const res = await fetch(`${origin}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; success?: boolean }
      if (!res.ok) {
        const msg = data.error || data.message || 'Erro ao reenviar código de verificação.'
        return {
          success: false,
          message: msg,
          error: msg
        }
      }
      return {
        success: true,
        message: data.message || 'Novo código de verificação enviado.'
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao reenviar código'
      return {
        success: false,
        message: msg,
        error: msg
      }
    }
  }

  const updateUser = (updatedData: Partial<AuthUser>) => {
    if (!user) return
    const newUser = { ...user, ...updatedData }
    setUser(newUser)
    if (session) {
      const newSession = { ...session, user: newUser }
      setSession(newSession)
      encryptedStorageAdapter
        .setItem(STORAGE_SESSION_KEY, JSON.stringify({ token: session.access_token, user: newUser }))
        .catch(() => {})
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithPassword,
        signUp,
        signInWithOAuth,
        signOut,
        verifyEmail,
        resendVerification,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
