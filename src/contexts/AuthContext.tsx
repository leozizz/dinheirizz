import React, { createContext, useContext, useEffect, useState } from 'react'
import { hashPasswordClient } from '../lib/crypto'
import { encryptedStorageAdapter } from '../lib/encryptedStorage'
import { supabase } from '../lib/supabase'

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
        // 1. Verifica se há sessão ativa via Supabase Auth (ex: retorno de redirecionamento Google OAuth)
        const { data: supabaseSessionData } = await supabase.auth
          .getSession()
          .catch(() => ({ data: { session: null } }))
        const supabaseSession = supabaseSessionData?.session

        if (supabaseSession?.access_token && supabaseSession.user) {
          const meta = (supabaseSession.user.user_metadata as Record<string, string | undefined>) || {}
          const fullName = meta.full_name || meta.name || (meta.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : null)
          const avatarUrl = meta.avatar_url || meta.picture || null
          const provider = (supabaseSession.user.app_metadata?.provider as string) || 'apple'

          const origin = getApiOrigin()
          const syncRes = await fetch(`${origin}/api/v1/users/sync`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${supabaseSession.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fullName: fullName ?? undefined,
              avatarUrl: avatarUrl ?? undefined,
              provider: provider
            })
          }).catch(() => null)

          if (syncRes && syncRes.ok) {
            const syncData = await syncRes.json().catch(() => null)
            if (syncData?.user) {
              const syncedUser: AuthUser = {
                id: syncData.user.id,
                email: syncData.user.email,
                fullName: syncData.user.fullName ?? null,
                username: syncData.user.username ?? null,
                avatarUrl: syncData.user.avatarUrl ?? null,
                provider: syncData.user.provider || provider,
                providers: syncData.user.providers || [provider],
                user_metadata: {
                  full_name: syncData.user.fullName ?? null,
                  username: syncData.user.username ?? null,
                  email: syncData.user.email
                }
              }
              const syncedSession: AuthSession = {
                access_token: supabaseSession.access_token,
                user: syncedUser
              }

              await encryptedStorageAdapter.setItem(
                STORAGE_SESSION_KEY,
                JSON.stringify({ token: supabaseSession.access_token, user: syncedUser })
              )

              setUser(syncedUser)
              setSession(syncedSession)

              // Higienização de URL: remove fragmentos ou query params sensíveis de OAuth (#access_token ou ?code)
              if (typeof window !== 'undefined' && window.history?.replaceState) {
                const cleanUrl = window.location.pathname
                window.history.replaceState({}, document.title, cleanUrl || '/')
              }

              setLoading(false)
              return
            }
          }
        }

        // 2. Fallback: Verificação de sessão salva em encryptedStorage
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        // Sessão encerrada externamente
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
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
      const options: { redirectTo: string; queryParams?: Record<string, string> } = {
        redirectTo: origin
      }

      if (provider === 'google') {
        options.queryParams = {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options
      })

      if (error) {
        return { error: { message: error.message } }
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
      await supabase.auth.signOut().catch(() => {})
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
