import { Hono } from 'hono'
import type { Context } from 'hono'
import { eq, or, and, desc, sql } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { getDb } from '../db/client'
import { users, verificationTokens } from '../db/schema'
import { signupSchema, loginSchema, verifyEmailSchema, resendVerificationSchema } from '../schemas/auth'
import { sendVerificationEmail } from '../services/email'
import type { AuthEnv } from '../middlewares/auth'

export const authRouter = new Hono<AuthEnv>()

type UUIDString = `${string}-${string}-${string}-${string}-${string}`

// Armazenamento em memória para testes unitários e modo offline
interface LocalAuthUser {
  id: string
  email: string
  passwordHash?: string
  fullName: string | null
  username: string | null
  provider: string
  providers: string[]
  emailVerified: boolean
  createdAt: string | Date
  updatedAt?: string | Date | null
}

interface LocalVerificationToken {
  id: string
  email: string
  token: string
  type: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

const mockAuthStore = new Map<string, LocalAuthUser>()
const mockTokenStore: LocalVerificationToken[] = []

const generateOtpCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const getJwtSecret = (c: Context<AuthEnv>): string => {
  const env = c.env as Record<string, string | undefined> | undefined
  return (
    env?.JWT_SECRET ||
    env?.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'dinheirizz-jwt-secret-dev-2026'
  )
}

const getSupabaseConfig = (c: Context<AuthEnv>): { url: string; anonKey: string } => {
  const env = c.env as Record<string, string | undefined> | undefined
  const url =
    env?.SUPABASE_URL ||
    env?.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  const anonKey =
    env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env?.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  return { url: url.replace(/\/$/, ''), anonKey }
}

// POST /api/v1/auth/signup
authRouter.post('/signup', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = signupSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const { email: rawEmail, password, fullName, username: rawUsername } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const username = rawUsername ? rawUsername.toLowerCase().trim() : null
  const db = getDb()

  const otpCode = generateOtpCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

  // 1. Verificação prévia de duplicatas no banco de dados
  if (!db) {
    // Ambiente mock / testes
    const emailExists = Array.from(mockAuthStore.values()).some((u) => u.email === email)
    if (emailExists) {
      return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
    }
    if (username) {
      const usernameExists = Array.from(mockAuthStore.values()).some((u) => u.username === username)
      if (usernameExists) {
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      }
    }

    const mockId = crypto.randomUUID()
    const mockUser: LocalAuthUser = {
      id: mockId,
      email,
      passwordHash: password,
      fullName: fullName || null,
      username,
      provider: 'email',
      providers: ['email'],
      emailVerified: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
    mockAuthStore.set(mockId, mockUser)

    mockTokenStore.push({
      id: crypto.randomUUID(),
      email,
      token: otpCode,
      type: 'email_verification',
      expiresAt,
      usedAt: null,
      createdAt: now
    })

    await sendVerificationEmail({
      to: email,
      code: otpCode,
      name: fullName || undefined
    })

    return c.json(
      {
        success: true,
        message: 'Cadastro realizado com sucesso.'
      },
      201
    )
  }

  try {
    // Verifica email duplicado em public.users
    const existingUsers = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), username ? eq(users.username, username) : sql`false`))
      .limit(1)

    if (existingUsers.length > 0) {
      const found = existingUsers[0]
      if (found.email === email) {
        return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
      }
      if (username && found.username === username) {
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      }
    }

    // Verifica email em auth.users do Supabase (cobrindo pendentes)
    const authRecords = await db
      .execute(sql`SELECT id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`)
      .catch(() => [])

    if (authRecords.length > 0) {
      return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
    }

    // 2. Criação do usuário no Supabase Auth via REST server-to-server
    const { url: supabaseUrl, anonKey } = getSupabaseConfig(c)
    let createdUserId: UUIDString = crypto.randomUUID() as UUIDString

    if (supabaseUrl && anonKey) {
      const supaRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            full_name: fullName,
            username
          }
        })
      })

      const supaData = (await supaRes.json().catch(() => ({}))) as {
        msg?: string
        error_description?: string
        message?: string
        identities?: unknown[]
        id?: UUIDString
      }

      if (!supaRes.ok) {
        const errorMsg = supaData.msg || supaData.error_description || supaData.message || 'Erro ao cadastrar usuário'
        if (errorMsg.toLowerCase().includes('already registered')) {
          return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
        }
        return c.json({ error: errorMsg }, 400)
      }

      // Se identities for vazio, o Supabase já possuía o e-mail cadastrado
      if (supaData.identities && Array.isArray(supaData.identities) && supaData.identities.length === 0) {
        return c.json({ error: 'Este e-mail já está cadastrado.' }, 409)
      }

      if (supaData.id) {
        createdUserId = supaData.id
      }
    }

    // 3. Persistência atômica no banco de dados da aplicação (public.users)
    await db
      .insert(users)
      .values({
        id: createdUserId,
        email,
        fullName: fullName || null,
        username,
        provider: 'email',
        providers: ['email'],
        emailVerified: false,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          fullName: fullName || null,
          username,
          updatedAt: now
        }
      })

    // 4. Persistência do token de verificação e disparo do e-mail via Resend
    await db.insert(verificationTokens).values({
      id: crypto.randomUUID() as UUIDString,
      email,
      token: otpCode,
      type: 'email_verification',
      expiresAt,
      createdAt: now
    })

    await sendVerificationEmail({
      to: email,
      code: otpCode,
      name: fullName || undefined
    })

    // Retorno estritamente sanitizado - Zero vazamento de dados internos
    return c.json(
      {
        success: true,
        message: 'Cadastro realizado com sucesso.'
      },
      201
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno ao processar cadastro'
    return c.json({ error: 'Erro interno ao processar cadastro', message }, 500)
  }
})

// POST /api/v1/auth/verify-email
authRouter.post('/verify-email', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = verifyEmailSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const { email: rawEmail, token } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const db = getDb()
  const now = new Date()

  if (!db) {
    const tokens = mockTokenStore
      .filter((t) => t.email === email && t.type === 'email_verification')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const latestToken = tokens[0]

    if (
      !latestToken ||
      latestToken.usedAt !== null ||
      now.getTime() > new Date(latestToken.expiresAt).getTime() ||
      latestToken.token !== token
    ) {
      return c.json({ error: 'Código de verificação inválido ou expirado.' }, 400)
    }

    latestToken.usedAt = now

    const user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    if (user) {
      user.emailVerified = true
      user.updatedAt = now.toISOString()
    }

    return c.json({
      success: true,
      message: 'E-mail verificado com sucesso.'
    })
  }

  try {
    const foundTokens = await db
      .select()
      .from(verificationTokens)
      .where(and(eq(verificationTokens.email, email), eq(verificationTokens.type, 'email_verification')))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)

    const latestToken = foundTokens[0]

    if (
      !latestToken ||
      latestToken.usedAt !== null ||
      now.getTime() > new Date(latestToken.expiresAt).getTime() ||
      latestToken.token !== token
    ) {
      return c.json({ error: 'Código de verificação inválido ou expirado.' }, 400)
    }

    await db
      .update(verificationTokens)
      .set({ usedAt: now })
      .where(eq(verificationTokens.id, latestToken.id))

    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: now })
      .where(eq(users.email, email))

    return c.json({
      success: true,
      message: 'E-mail verificado com sucesso.'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar verificação de e-mail'
    return c.json({ error: 'Erro interno ao verificar e-mail', message }, 500)
  }
})

// POST /api/v1/auth/resend-verification
authRouter.post('/resend-verification', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = resendVerificationSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const { email: rawEmail } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const db = getDb()
  const now = new Date()

  if (!db) {
    const user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    if (user?.emailVerified) {
      return c.json({ error: 'Este e-mail já foi verificado.' }, 400)
    }

    // Rate limiting: 60 segundos
    const tokens = mockTokenStore
      .filter((t) => t.email === email && t.type === 'email_verification')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const lastToken = tokens[0]

    if (lastToken && now.getTime() - new Date(lastToken.createdAt).getTime() < 60 * 1000) {
      return c.json({ error: 'Aguarde 60 segundos antes de solicitar um novo código.' }, 429)
    }

    const otpCode = generateOtpCode()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

    mockTokenStore.push({
      id: crypto.randomUUID(),
      email,
      token: otpCode,
      type: 'email_verification',
      expiresAt,
      usedAt: null,
      createdAt: now
    })

    await sendVerificationEmail({
      to: email,
      code: otpCode,
      name: user?.fullName || undefined
    })

    return c.json({
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail.'
    })
  }

  try {
    const existingUsers = await db
      .select({ emailVerified: users.emailVerified, fullName: users.fullName })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUsers.length > 0 && existingUsers[0].emailVerified) {
      return c.json({ error: 'Este e-mail já foi verificado.' }, 400)
    }

    // Rate limiting: 60 segundos
    const foundTokens = await db
      .select({ createdAt: verificationTokens.createdAt })
      .from(verificationTokens)
      .where(and(eq(verificationTokens.email, email), eq(verificationTokens.type, 'email_verification')))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)

    const lastToken = foundTokens[0]

    if (lastToken && now.getTime() - new Date(lastToken.createdAt).getTime() < 60 * 1000) {
      return c.json({ error: 'Aguarde 60 segundos antes de solicitar um novo código.' }, 429)
    }

    const otpCode = generateOtpCode()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

    await db.insert(verificationTokens).values({
      id: crypto.randomUUID() as UUIDString,
      email,
      token: otpCode,
      type: 'email_verification',
      expiresAt,
      createdAt: now
    })

    await sendVerificationEmail({
      to: email,
      code: otpCode,
      name: existingUsers[0]?.fullName || undefined
    })

    return c.json({
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail.'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao reenviar código de verificação'
    return c.json({ error: 'Erro interno ao reenviar verificação', message }, 500)
  }
})

// POST /api/v1/auth/login
authRouter.post('/login', async (c) => {
  const rawBody = await c.req.json().catch(() => ({}))
  const parsed = loginSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Credenciais inválidas',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const { email: rawEmail, password } = parsed.data
  const email = rawEmail.toLowerCase().trim()
  const db = getDb()
  const secret = getJwtSecret(c)

  // 1. Cenário de Mock / Testes unitários
  if (!db) {
    const user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    if (!user || (user.passwordHash && user.passwordHash !== password)) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401)
    }

    const token = await sign(
      {
        sub: user.id,
        id: user.id,
        email: user.email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 dias
      },
      secret,
      'HS256'
    )

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      }
    })
  }

  try {
    const { url: supabaseUrl, anonKey } = getSupabaseConfig(c)
    let authUserId: UUIDString | null = null

    // 2. Autenticação server-side com Supabase Auth
    if (supabaseUrl && anonKey) {
      const supaRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const supaData = (await supaRes.json().catch(() => ({}))) as { user?: { id?: UUIDString } }

      if (!supaRes.ok) {
        return c.json({ error: 'E-mail ou senha incorretos' }, 401)
      }

      authUserId = supaData.user?.id || null
    }

    // 3. Localiza ou sincroniza usuário em public.users
    const records = await db
      .select()
      .from(users)
      .where(authUserId ? or(eq(users.id, authUserId), eq(users.email, email)) : eq(users.email, email))
      .limit(1)

    let userRecord = records[0]

    if (!userRecord) {
      const newId: UUIDString = authUserId || (crypto.randomUUID() as UUIDString)
      const inserted = await db
        .insert(users)
        .values({
          id: newId,
          email,
          provider: 'email',
          providers: ['email'],
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
      userRecord = inserted[0]
    }

    // 4. Emissão de JWT próprio assinado pelo BFF
    const token = await sign(
      {
        sub: userRecord.id,
        id: userRecord.id,
        email: userRecord.email,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 dias
      },
      secret,
      'HS256'
    )

    // Retorno estritamente sanitizado
    return c.json({
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName ?? null,
        username: userRecord.username ?? null
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno ao autenticar usuário'
    return c.json({ error: 'Erro interno ao autenticar usuário', message }, 500)
  }
})

// POST /api/v1/auth/logout
authRouter.post('/logout', async (c) => {
  return c.json({ success: true, message: 'Sessão encerrada com sucesso.' })
})

// GET /api/v1/auth/me (Protegido por authMiddleware)
authRouter.get('/me', async (c) => {
  const userId = c.get('userId')
  const authUser = c.get('user')
  const email = ((authUser?.email as string) || '').toLowerCase()

  const db = getDb()

  if (!db) {
    let user = mockAuthStore.get(userId)
    if (!user && email) {
      user = Array.from(mockAuthStore.values()).find((u) => u.email === email)
    }

    if (!user) {
      return c.json({
        user: {
          id: userId,
          email: email || 'user@dinheirizz.com',
          fullName: null,
          username: null
        }
      })
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      }
    })
  }

  try {
    const records = await db
      .select()
      .from(users)
      .where(or(eq(users.id, userId), eq(users.email, email)))
      .limit(1)

    if (records.length > 0) {
      const u = records[0]
      return c.json({
        user: {
          id: u.id,
          email: u.email,
          fullName: u.fullName ?? null,
          username: u.username ?? null
        }
      })
    }

    return c.json({
      user: {
        id: userId,
        email,
        fullName: null,
        username: null
      }
    })
  } catch {
    return c.json({ error: 'Erro ao buscar perfil autenticado' }, 500)
  }
})
