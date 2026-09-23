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

interface AuthContextType {
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
  updateUser: (updatedData: Partial<AuthUser>) => void
}

const STORAGE_SESSION_KEY = 'dinheirizz_auth_session'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await encryptedStorageAdapter.getItem(STORAGE_SESSION_KEY)
        if (!stored) {
          setLoading(false)
          return
        }

        const parsed = JSON.parse(stored)
        if (!parsed || !parsed.token) {
          setLoading(false)
          return
        }

        // Validação da sessão contra o BFF /api/v1/auth/me
        const origin = getApiOrigin()
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

  const signInWithPassword = async ({ email, password }: { email: string; password: string }): Promise<SignInResult> => {
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
    } catch (err: any) {
      return {
        error: { message: err?.message || 'Falha na comunicação com o servidor' },
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
    } catch (err: any) {
      return {
        error: { message: err?.message || 'Falha na comunicação com o servidor' },
        user: null,
        session: null,
        isDuplicate: false
      }
    }
  }

  const signInWithOAuth = async (_provider: 'google' | 'apple') => {
    return {
      error: { message: 'Login social será disponibilizado nas próximas fases.' }
    }
  }

  const signOut = async () => {
    try {
      const origin = getApiOrigin()
      await fetch(`${origin}/api/v1/auth/logout`, { method: 'POST' }).catch(() => {})
      await encryptedStorageAdapter.removeItem(STORAGE_SESSION_KEY)
      setSession(null)
      setUser(null)
      return { error: null }
    } catch (err: any) {
      return { error: { message: err?.message || 'Erro ao deslogar' } }
    }
  }

  const updateUser = (updatedData: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null
      const merged: AuthUser = { ...prev, ...updatedData }
      if (updatedData.fullName !== undefined || updatedData.username !== undefined) {
        merged.user_metadata = {
          ...merged.user_metadata,
          full_name: updatedData.fullName !== undefined ? updatedData.fullName : merged.user_metadata?.full_name,
          username: updatedData.username !== undefined ? updatedData.username : merged.user_metadata?.username
        }
      }
      return merged
    })
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
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
