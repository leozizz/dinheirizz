import { eq, and, desc, asc } from 'drizzle-orm'
import type { getDb } from '../db/client'
import { financialProfiles } from '../db/schema'
import { mockWorkspacesStore } from '../routes/workspaces'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ParsedProfileQuery {
  valid: boolean
  profileId: string | null
}

/**
 * Interpreta o query param `profileId`.
 * Ausente ou `'all'` retorna `{ valid: true, profileId: null }` (visão consolidada).
 */
export const parseProfileIdQuery = (rawProfileId: string | undefined): ParsedProfileQuery => {
  if (!rawProfileId || rawProfileId === 'all') {
    return { valid: true, profileId: null }
  }
  if (UUID_REGEX.test(rawProfileId)) {
    return { valid: true, profileId: rawProfileId }
  }
  return { valid: false, profileId: null }
}

export type ResolveProfileResult =
  | { ok: true; profileId: string | null }
  | { ok: false; status: 400 | 404; error: string }

/**
 * Valida se o `profileId` informado pertence ao `userId`, ou resolve o perfil padrão quando omitido.
 */
export const resolveUserProfileId = async (
  db: ReturnType<typeof getDb>,
  userId: string,
  requestedProfileId: string | null | undefined
): Promise<ResolveProfileResult> => {
  if (requestedProfileId === null) {
    return { ok: true, profileId: null }
  }

  if (requestedProfileId !== undefined) {
    if (!UUID_REGEX.test(requestedProfileId)) {
      return { ok: false, status: 400, error: 'ID de perfil financeiro inválido' }
    }

    if (!db) {
      const profile = mockWorkspacesStore.get(requestedProfileId)
      if (!profile || profile.userId !== userId) {
        return { ok: false, status: 404, error: 'Perfil financeiro não encontrado' }
      }
      return { ok: true, profileId: profile.id }
    }

    const [profile] = await db
      .select({ id: financialProfiles.id })
      .from(financialProfiles)
      .where(and(eq(financialProfiles.id, requestedProfileId), eq(financialProfiles.userId, userId)))
      .limit(1)

    if (!profile) {
      return { ok: false, status: 404, error: 'Perfil financeiro não encontrado' }
    }
    return { ok: true, profileId: profile.id }
  }

  // Quando omitido, tenta vincular ao perfil padrão do usuário (se existir)
  if (!db) {
    const userProfiles = Array.from(mockWorkspacesStore.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
        return a.createdAt.localeCompare(b.createdAt)
      })
    return { ok: true, profileId: userProfiles[0]?.id ?? null }
  }

  const [defaultProfile] = await db
    .select({ id: financialProfiles.id })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .orderBy(desc(financialProfiles.isDefault), asc(financialProfiles.createdAt))
    .limit(1)

  return { ok: true, profileId: defaultProfile?.id ?? null }
}
