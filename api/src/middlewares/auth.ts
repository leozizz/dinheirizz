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

  // Chave secreta de validação do JWT (definida no Supabase Cloud / Edge env)
  const secret =
    (c.env as { SUPABASE_JWT_SECRET?: string } | undefined)?.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET

  if (!secret) {
    return c.json(
      {
        error: 'Erro de configuração',
        message: 'SUPABASE_JWT_SECRET não configurado no servidor'
      },
      500
    )
  }

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
