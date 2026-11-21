import { Hono } from 'hono'
import type { AuthEnv } from '../middlewares/auth'
import { parseReceiptRequestSchema } from '../schemas/aiReceipt'
import { parseReceiptWithGemini, ReceiptOcrError } from '../services/geminiReceipt'
import { resolveAiCredentials } from '../services/aiCredentials'
import type { ParseReceiptResponse, ParseReceiptErrorResponse } from '../../../src/types/aiReceipt'

export const aiReceiptRouter = new Hono<AuthEnv>()

const MAX_BASE64_LENGTH = 14 * 1024 * 1024 // ~10MB binário após codificação base64

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
