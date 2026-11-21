import { Hono } from 'hono'
import type { AuthEnv } from '../middlewares/auth'
import { aiChatRequestSchema } from '../schemas/aiChat'
import { resolveAiCredentials } from '../services/aiCredentials'
import { buildCopilotContext } from '../services/copilotContext'
import { runCopilotWithGemini } from '../services/geminiCopilot'
import { getDb } from '../db/client'
import { resolveUserProfileId } from '../lib/profileFilter'
import type { AiChatResponse } from '../../../src/types/aiChat'

export const aiChatRouter = new Hono<AuthEnv>()

aiChatRouter.post('/chat', async (c) => {
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
    return c.json({ error: 'Dados inválidos' }, 400)
  }

  const parsed = aiChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.format()
      },
      400
    )
  }

  let resolvedProfileId: string | null = null
  if (parsed.data.profileId) {
    const profileRes = await resolveUserProfileId(getDb(), userId, parsed.data.profileId)
    if (!profileRes.ok) {
      return c.json({ error: profileRes.error }, profileRes.status)
    }
    resolvedProfileId = profileRes.profileId
  }

  const credentials = await resolveAiCredentials(userId, userEmail)
  if (!credentials) {
    const fallbackResponse: AiChatResponse = {
      reply:
        'Para conversar com o Copiloto Financeiro usando seus dados reais, cadastre sua chave gratuita do Google Gemini em Configurações > Inteligência Artificial (BYOK) ou utilize uma conta PRO.',
      source: 'fallback',
      modelName: null,
      requiresApiKey: true,
      citations: [],
      actionCards: []
    }
    return c.json(fallbackResponse, 200)
  }

  try {
    const context = await buildCopilotContext({
      userId,
      period: parsed.data.period,
      profileId: resolvedProfileId
    })

    const result = await runCopilotWithGemini({
      userId,
      profileId: resolvedProfileId,
      apiKey: credentials.apiKey,
      modelName: credentials.modelName,
      messages: parsed.data.messages,
      context
    })

    const response: AiChatResponse = {
      reply: result.reply,
      source: credentials.source,
      modelName: credentials.modelName,
      requiresApiKey: false,
      citations: result.citations,
      actionCards: result.actionCards
    }

    return c.json(response, 200)
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Falha ao processar sua solicitação no Copiloto Financeiro'
    return c.json(
      {
        error: 'Erro no processamento de IA',
        message
      },
      502
    )
  }
})
