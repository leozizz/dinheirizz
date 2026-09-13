import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export type AuthUser = {
  id: string
  email?: string
  role?: string
  [key: string]: unknown
}

export type AuthEnv = {
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

  // Chave secreta de validação do JWT (JWT_SECRET ou SUPABASE_JWT_SECRET ou fallback local)
  const secret =
    (c.env as { JWT_SECRET?: string; SUPABASE_JWT_SECRET?: string } | undefined)?.JWT_SECRET ||
    (c.env as { JWT_SECRET?: string; SUPABASE_JWT_SECRET?: string } | undefined)?.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'dinheirizz-jwt-secret-dev-2026'

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
