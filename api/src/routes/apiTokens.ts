import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { mcpAuditLogs, personalApiTokens } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import { createApiTokenSchema, type McpScope } from '../schemas/mcp'
import { generatePersonalApiToken } from '../lib/apiTokenCrypto'

export interface MockPersonalApiToken {
  id: string
  userId: string
  name: string
  tokenPrefix: string
  tokenHash: string
  scopes: McpScope[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface MockMcpAuditLog {
  id: string
  tokenId: string
  userId: string
  toolName: string
  status: 'success' | 'forbidden' | 'error'
  createdAt: string
}

export interface PublicApiTokenDto {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export const mockPersonalApiTokensStore = new Map<string, MockPersonalApiToken>()
export const mockMcpAuditLogsStore = new Map<string, MockMcpAuditLog>()

const toPublicToken = (row: {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt: Date | string | null
  expiresAt: Date | string | null
  revokedAt: Date | string | null
  createdAt: Date | string
}): PublicApiTokenDto => {
  const toIso = (value: Date | string | null): string | null => {
    if (!value) return null
    return value instanceof Date ? value.toISOString() : value
  }

  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: row.scopes,
    lastUsedAt: toIso(row.lastUsedAt),
    expiresAt: toIso(row.expiresAt),
    revokedAt: toIso(row.revokedAt),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString()
  }
}

export const apiTokensRouter = new Hono<AuthEnv>()

// GET /api/v1/api-tokens
apiTokensRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    const tokens = Array.from(mockPersonalApiTokensStore.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublicToken)
    return c.json({ tokens })
  }

  try {
    const rows = await db
      .select({
        id: personalApiTokens.id,
        name: personalApiTokens.name,
        tokenPrefix: personalApiTokens.tokenPrefix,
        scopes: personalApiTokens.scopes,
        lastUsedAt: personalApiTokens.lastUsedAt,
        expiresAt: personalApiTokens.expiresAt,
        revokedAt: personalApiTokens.revokedAt,
        createdAt: personalApiTokens.createdAt
      })
      .from(personalApiTokens)
      .where(eq(personalApiTokens.userId, userId))
      .orderBy(desc(personalApiTokens.createdAt))

    return c.json({ tokens: rows.map(toPublicToken) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao listar tokens MCP', details: message }, 500)
  }
})

// GET /api/v1/api-tokens/logs (registrado antes de /:id)
apiTokensRouter.get('/logs', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    const logs = Array.from(mockMcpAuditLogsStore.values())
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
      .map((l) => ({
        id: l.id,
        tokenId: l.tokenId,
        tokenName: mockPersonalApiTokensStore.get(l.tokenId)?.name ?? 'Token removido',
        toolName: l.toolName,
        status: l.status,
        createdAt: l.createdAt
      }))

    return c.json({ logs })
  }

  try {
    const rows = await db
      .select({
        id: mcpAuditLogs.id,
        tokenId: mcpAuditLogs.tokenId,
        tokenName: personalApiTokens.name,
        toolName: mcpAuditLogs.toolName,
        status: mcpAuditLogs.status,
        createdAt: mcpAuditLogs.createdAt
      })
      .from(mcpAuditLogs)
      .leftJoin(personalApiTokens, eq(mcpAuditLogs.tokenId, personalApiTokens.id))
      .where(eq(mcpAuditLogs.userId, userId))
      .orderBy(desc(mcpAuditLogs.createdAt))
      .limit(30)

    const logs = rows.map((row) => ({
      id: row.id,
      tokenId: row.tokenId,
      tokenName: row.tokenName ?? 'Token removido',
      toolName: row.toolName,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }))

    return c.json({ logs })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao listar logs de auditoria MCP', details: message }, 500)
  }
})

// POST /api/v1/api-tokens
apiTokensRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => null)
  const parsed = createApiTokenSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos para criação de token MCP',
        details: parsed.error.flatten().fieldErrors
      },
      400
    )
  }

  const { name, scopes, expiresInDays } = parsed.data
  const generated = await generatePersonalApiToken()
  const now = new Date()
  const expiresAt =
    typeof expiresInDays === 'number'
      ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

  const db = getDb()

  if (!db) {
    const id = crypto.randomUUID()
    const record: MockPersonalApiToken = {
      id,
      userId,
      name,
      tokenPrefix: generated.tokenPrefix,
      tokenHash: generated.tokenHash,
      scopes,
      lastUsedAt: null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      revokedAt: null,
      createdAt: now.toISOString()
    }
    mockPersonalApiTokensStore.set(id, record)

    return c.json(
      {
        token: toPublicToken(record),
        plainTextToken: generated.plainTextToken
      },
      201
    )
  }

  try {
    const [inserted] = await db
      .insert(personalApiTokens)
      .values({
        userId,
        name,
        tokenPrefix: generated.tokenPrefix,
        tokenHash: generated.tokenHash,
        scopes,
        expiresAt
      })
      .returning({
        id: personalApiTokens.id,
        name: personalApiTokens.name,
        tokenPrefix: personalApiTokens.tokenPrefix,
        scopes: personalApiTokens.scopes,
        lastUsedAt: personalApiTokens.lastUsedAt,
        expiresAt: personalApiTokens.expiresAt,
        revokedAt: personalApiTokens.revokedAt,
        createdAt: personalApiTokens.createdAt
      })

    return c.json(
      {
        token: toPublicToken(inserted),
        plainTextToken: generated.plainTextToken
      },
      201
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao criar token MCP', details: message }, 500)
  }
})

// DELETE /api/v1/api-tokens/:id
apiTokensRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const tokenId = c.req.param('id')
  const now = new Date()
  const db = getDb()

  if (!db) {
    const existing = mockPersonalApiTokensStore.get(tokenId)
    if (!existing || existing.userId !== userId) {
      return c.json({ error: 'Token MCP não encontrado' }, 404)
    }

    const revokedAt = existing.revokedAt ?? now.toISOString()
    mockPersonalApiTokensStore.set(tokenId, {
      ...existing,
      revokedAt
    })

    return c.json({
      revoked: true,
      id: tokenId,
      revokedAt
    })
  }

  try {
    const [updated] = await db
      .update(personalApiTokens)
      .set({ revokedAt: now })
      .where(and(eq(personalApiTokens.id, tokenId), eq(personalApiTokens.userId, userId)))
      .returning({
        id: personalApiTokens.id,
        revokedAt: personalApiTokens.revokedAt
      })

    if (!updated) {
      return c.json({ error: 'Token MCP não encontrado' }, 404)
    }

    return c.json({
      revoked: true,
      id: updated.id,
      revokedAt: (updated.revokedAt ?? now).toISOString()
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json({ error: 'Falha ao revogar token MCP', details: message }, 500)
  }
})
