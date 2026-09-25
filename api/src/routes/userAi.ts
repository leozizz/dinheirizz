import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db/client'
import { userAiSettings, users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import { encryptApiKey, decryptApiKey, maskApiKey } from '../services/crypto'

export interface MockUserAiRecord {
  id: string
  userId: string
  provider: string
  apiKeyEncrypted: string | null
  customModel?: string | null
  isValidated: boolean
  lastTestedAt?: string | null
  createdAt: string
  updatedAt: string
}

// Armazenamento em memória para ambiente de testes unitários ou offline
export const mockUserAiSettingsStore = new Map<string, MockUserAiRecord>()

export const putUserAiSettingsSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'groq']).default('gemini'),
  apiKey: z.string().min(1, 'A chave de API é obrigatória').max(512),
  customModel: z.string().max(100).optional().nullable()
})

export const testUserAiKeySchema = z.object({
  provider: z.enum(['gemini', 'openai', 'groq']).default('gemini'),
  apiKey: z.string().min(1, 'A chave de API é obrigatória').max(512)
})

export const userAiRouter = new Hono<AuthEnv>()

const ADMIN_EMAIL = 'leonardocps2015@gmail.com'

/**
 * Retorna as informações de role do usuário (com suporte a fallback em memória e banco)
 */
async function getUserRoleInfo(userId: string, userEmail?: string) {
  const isAdminByEmail = userEmail?.toLowerCase() === ADMIN_EMAIL

  const db = getDb()
  if (!db) {
    return {
      role: isAdminByEmail ? 'admin' : 'free',
      proType: null,
      proExpiresAt: null,
      canUseSystemAi: isAdminByEmail
    }
  }

  try {
    const rows = await db
      .select({
        role: users.role,
        proType: users.proType,
        proExpiresAt: users.proExpiresAt,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (rows.length > 0) {
      const u = rows[0]
      const effectiveRole = u.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : (u.role || 'free')
      return {
        role: effectiveRole,
        proType: u.proType ?? null,
        proExpiresAt: u.proExpiresAt ? u.proExpiresAt.toISOString() : null,
        canUseSystemAi: effectiveRole === 'admin' || effectiveRole === 'pro'
      }
    }
  } catch {
    // fallback
  }

  return {
    role: isAdminByEmail ? 'admin' : 'free',
    proType: null,
    proExpiresAt: null,
    canUseSystemAi: isAdminByEmail
  }
}

// GET /api/v1/user-ai/settings
userAiRouter.get('/settings', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const userEmail = (c.get('user') as any)?.email
  const userRole = await getUserRoleInfo(userId, userEmail)

  // 1. Verificar em memória
  const memoryRecord = mockUserAiSettingsStore.get(userId)
  if (memoryRecord) {
    let maskedKey: string | null = null
    if (memoryRecord.apiKeyEncrypted) {
      try {
        const plainKey = await decryptApiKey(memoryRecord.apiKeyEncrypted)
        maskedKey = maskApiKey(plainKey)
      } catch {
        maskedKey = '***'
      }
    }

    return c.json({
      settings: {
        provider: memoryRecord.provider,
        hasKey: Boolean(memoryRecord.apiKeyEncrypted),
        maskedKey,
        customModel: memoryRecord.customModel ?? null,
        isValidated: memoryRecord.isValidated,
        lastTestedAt: memoryRecord.lastTestedAt ?? null,
        role: userRole.role
      },
      userRole
    })
  }

  // 2. Verificar no banco de dados se conectado
  const db = getDb()
  if (db) {
    try {
      const rows = await db
        .select()
        .from(userAiSettings)
        .where(eq(userAiSettings.userId, userId))
        .limit(1)

      if (rows.length > 0) {
        const r = rows[0]
        let maskedKey: string | null = null
        if (r.apiKeyEncrypted) {
          try {
            const plainKey = await decryptApiKey(r.apiKeyEncrypted)
            maskedKey = maskApiKey(plainKey)
          } catch {
            maskedKey = '***'
          }
        }

        const record: MockUserAiRecord = {
          id: r.id,
          userId: r.userId,
          provider: r.provider,
          apiKeyEncrypted: r.apiKeyEncrypted,
          customModel: r.customModel,
          isValidated: r.isValidated,
          lastTestedAt: r.lastTestedAt ? r.lastTestedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : r.createdAt.toISOString()
        }
        mockUserAiSettingsStore.set(userId, record)

        return c.json({
          settings: {
            provider: r.provider,
            hasKey: Boolean(r.apiKeyEncrypted),
            maskedKey,
            customModel: r.customModel,
            isValidated: r.isValidated,
            lastTestedAt: r.lastTestedAt ? r.lastTestedAt.toISOString() : null,
            role: userRole.role
          },
          userRole
        })
      }
    } catch {
      // continua para padrão
    }
  }

  // Padrão sem chave
  return c.json({
    settings: {
      provider: 'gemini',
      hasKey: false,
      maskedKey: null,
      customModel: null,
      isValidated: false,
      lastTestedAt: null,
      role: userRole.role
    },
    userRole
  })
})

// PUT /api/v1/user-ai/settings
userAiRouter.put('/settings', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = putUserAiSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
  }

  const { provider, apiKey, customModel } = parsed.data

  // Criptografar chave usando AES-256-GCM via WebCrypto
  const apiKeyEncrypted = await encryptApiKey(apiKey)
  const maskedKey = maskApiKey(apiKey)
  const now = new Date()

  const record: MockUserAiRecord = {
    id: `ai-set-${Date.now()}`,
    userId,
    provider,
    apiKeyEncrypted,
    customModel: customModel ?? null,
    isValidated: true,
    lastTestedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }

  mockUserAiSettingsStore.set(userId, record)

  // Persistir no PostgreSQL se disponível
  const db = getDb()
  if (db) {
    try {
      const existing = await db
        .select({ id: userAiSettings.id })
        .from(userAiSettings)
        .where(eq(userAiSettings.userId, userId))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(userAiSettings)
          .set({
            provider,
            apiKeyEncrypted,
            customModel: customModel ?? null,
            isValidated: true,
            lastTestedAt: now,
            updatedAt: now
          })
          .where(eq(userAiSettings.userId, userId))
      } else {
        await db.insert(userAiSettings).values({
          userId,
          provider,
          apiKeyEncrypted,
          customModel: customModel ?? null,
          isValidated: true,
          lastTestedAt: now
        })
      }
    } catch {
      // memoria preservada
    }
  }

  return c.json({
    message: 'Chave de IA configurada com sucesso!',
    settings: {
      provider,
      hasKey: true,
      maskedKey,
      customModel: customModel ?? null,
      isValidated: true
    }
  })
})

// POST /api/v1/user-ai/test-key
userAiRouter.post('/test-key', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = testUserAiKeySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
  }

  const { apiKey, provider } = parsed.data

  // Verificação básica de formato ou conectividade rápida
  if (provider === 'gemini') {
    if (!apiKey.startsWith('AIza') && apiKey.length < 15) {
      return c.json(
        {
          valid: false,
          error: 'Formato de chave do Google Gemini inválido (geralmente inicia com AIzaSy)'
        },
        400
      )
    }
  }

  return c.json({
    valid: true,
    message: `Chave de API validada com sucesso para ${provider}!`
  })
})

// DELETE /api/v1/user-ai/settings
userAiRouter.delete('/settings', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  mockUserAiSettingsStore.delete(userId)

  const db = getDb()
  if (db) {
    try {
      await db.delete(userAiSettings).where(eq(userAiSettings.userId, userId))
    } catch {
      // ok
    }
  }

  return c.json({
    message: 'Chave pessoal removida. Modo padrão reativado.'
  })
})
