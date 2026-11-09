import { Hono } from 'hono'
import type { AuthEnv } from '../middlewares/auth'
import { parseReceiptRequestSchema } from '../schemas/aiReceipt'
import { parseReceiptWithGemini, ReceiptOcrError } from '../services/geminiReceipt'
import { mockUserAiSettingsStore } from './userAi'
import { decryptApiKey } from '../services/crypto'
import { getDb } from '../db/client'
import { userAiSettings, users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ParseReceiptResponse, ParseReceiptErrorResponse } from '../../../src/types/aiReceipt'

export const aiReceiptRouter = new Hono<AuthEnv>()

const ADMIN_EMAIL = 'leonardocps2015@gmail.com'
const MAX_BASE64_LENGTH = 14 * 1024 * 1024 // ~10MB binário após codificação base64

interface ResolvedCredentials {
  apiKey: string
  source: 'byok' | 'system'
  provider: string
  modelName: string
}

const resolveAiCredentials = async (
  userId: string,
  userEmail?: string
): Promise<ResolvedCredentials | null> => {
  const isAdminByEmail = userEmail?.toLowerCase() === ADMIN_EMAIL

  // 1. Chave BYOK do usuário em cache de memória
  const memorySetting = mockUserAiSettingsStore.get(userId)
  if (memorySetting?.apiKeyEncrypted) {
    try {
      const apiKey = await decryptApiKey(memorySetting.apiKeyEncrypted)
      return {
        apiKey,
        source: 'byok',
        provider: memorySetting.provider || 'gemini',
        modelName: memorySetting.customModel || 'gemini-1.5-flash'
      }
    } catch {
      // continua para próximo nível
    }
  }

  // 1.1 Chave BYOK no banco de dados se conectado
  const db = getDb()
  if (db) {
    try {
      const settings = await db
        .select()
        .from(userAiSettings)
        .where(eq(userAiSettings.userId, userId))
        .limit(1)

      if (settings.length > 0 && settings[0].apiKeyEncrypted) {
        const apiKey = await decryptApiKey(settings[0].apiKeyEncrypted)
        return {
          apiKey,
          source: 'byok',
          provider: settings[0].provider || 'gemini',
          modelName: settings[0].customModel || 'gemini-1.5-flash'
        }
      }
    } catch {
      // continua para checagem de privilégio
    }
  }

  // 2. Chave corporativa interna (se Admin ou Pro)
  let isPrivileged = isAdminByEmail
  if (!isPrivileged && db) {
    try {
      const userRows = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (userRows.length > 0) {
        const r = userRows[0]
        if (
          r.email?.toLowerCase() === ADMIN_EMAIL ||
          r.role === 'admin' ||
          r.role === 'pro'
        ) {
          isPrivileged = true
        }
      }
    } catch {
      // continua
    }
  }

  if (isPrivileged && process.env.GEMINI_API_KEY) {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      source: 'system',
      provider: 'gemini',
      modelName: 'gemini-1.5-flash'
    }
  }

  return null
}

aiReceiptRouter.post('/parse-receipt', async (c) => {
  const userId = c.get('userId')
  const user = c.get('user')
  const userEmail = typeof user === 'object' && user ? user.email : undefined

  if (!userId) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Corpo da requisição deve ser um JSON válido' }, 400)
  }

  const rawPayload = body as { fileBase64?: unknown }
  if (typeof rawPayload?.fileBase64 === 'string' && rawPayload.fileBase64.length > MAX_BASE64_LENGTH) {
    const errorResponse: ParseReceiptErrorResponse = {
      error: 'Arquivo muito grande',
      code: 'FILE_TOO_LARGE',
      message: 'O tamanho do arquivo não pode ultrapassar 10MB.'
    }
    return c.json(errorResponse, 413)
  }

  const parsed = parseReceiptRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos para leitura do comprovante',
        details: parsed.error.format()
      },
      400
    )
  }

  const credentials = await resolveAiCredentials(userId, userEmail)
  if (!credentials) {
    const errorResponse: ParseReceiptErrorResponse = {
      error: 'Chave de IA necessária',
      code: 'AI_KEY_REQUIRED',
      message:
        'Para escanear comprovantes na conta Free, cadastre sua chave gratuita do Gemini em Configurações > Inteligência Artificial ou assine o Dinheirizz PRO.'
    }
    return c.json(errorResponse, 403)
  }

  try {
    const extractedData = await parseReceiptWithGemini({
      fileBase64: parsed.data.fileBase64,
      mimeType: parsed.data.mimeType,
      apiKey: credentials.apiKey,
      modelName: credentials.modelName,
      availableCategories: parsed.data.availableCategories
    })

    const successResponse: ParseReceiptResponse = {
      success: true,
      data: extractedData,
      source: credentials.source,
      provider: credentials.provider,
      modelName: credentials.modelName
    }

    return c.json(successResponse, 200)
  } catch (err: unknown) {
    if (err instanceof ReceiptOcrError && err.code === 'RECEIPT_UNREADABLE') {
      const errorResponse: ParseReceiptErrorResponse = {
        error: err.message,
        code: 'RECEIPT_UNREADABLE',
        message: err.message
      }
      return c.json(errorResponse, 422)
    }

    const message = err instanceof Error ? err.message : 'Falha interna durante a leitura do comprovante'
    const errorResponse: ParseReceiptErrorResponse = {
      error: 'Erro no processamento de IA',
      code: 'AI_SERVICE_ERROR',
      message
    }
    return c.json(errorResponse, 502)
  }
})
