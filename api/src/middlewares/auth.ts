import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { isProductionEnv, type RuntimeEnv } from '../lib/env'

export type AuthUser = {
  id: string
  email?: string
  role?: string
  [key: string]: unknown
}

export type AuthEnv = {
  Bindings: RuntimeEnv
  Variables: {
    userId: string
    user: AuthUser
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: 'Não autorizado',
        message: 'Token de autenticação ausente ou inválido no formato Bearer'
      },
      401
    )
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return c.json(
      {
        error: 'Não autorizado',
        message: 'Token de autenticação ausente'
      },
      401
    )
  }

  // Chave secreta de validação do JWT (JWT_SECRET ou SUPABASE_JWT_SECRET)
  const isProduction = isProductionEnv(c.env)
  const envSecret =
    c.env?.JWT_SECRET ||
    c.env?.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET

  if (isProduction && !envSecret) {
    return c.json(
      {
        error: 'Erro de configuração no servidor',
        message: 'Variável JWT_SECRET ou SUPABASE_JWT_SECRET não configurada no ambiente de produção'
      },
      500
    )
  }

  const secret = envSecret || 'dinheirizz-jwt-secret-dev-2026'

  try {
    const payload = await verify(token, secret, 'HS256')

    const userId = (payload.sub as string) || (payload.id as string)
    if (!userId) {
      return c.json(
        {
          error: 'Não autorizado',
          message: 'Token não contém identificador de usuário válido'
        },
        401
      )
    }

    c.set('userId', userId)
    c.set('user', {
      id: userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
      ...payload
    })

    await next()
  } catch {
    return c.json(
      {
        error: 'Não autorizado',
        message: 'Token de autenticação inválido ou expirado'
      },
      401
    )
  }
})
