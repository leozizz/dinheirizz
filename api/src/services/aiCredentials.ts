import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { userAiSettings, users } from '../db/schema'
import { mockUserAiSettingsStore } from '../routes/userAi'
import { decryptApiKey } from './crypto'

const ADMIN_EMAIL = 'leonardocps2015@gmail.com'

export interface ResolvedAiCredentials {
  apiKey: string
  source: 'byok' | 'system'
  provider: string
  modelName: string
}

export const resolveAiCredentials = async (
  userId: string,
  userEmail?: string
): Promise<ResolvedAiCredentials | null> => {
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
    } catch (err: unknown) {
      void err
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
    } catch (err: unknown) {
      void err
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
    } catch (err: unknown) {
      void err
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
