import { createMiddleware } from 'hono/factory'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { personalApiTokens } from '../db/schema'
import { hashApiToken } from '../lib/apiTokenCrypto'
import type { RuntimeEnv } from '../lib/env'
import { mockPersonalApiTokensStore } from '../routes/apiTokens'
import { MCP_SCOPES, type McpScope } from '../schemas/mcp'

export type McpAuthEnv = {
  Bindings: RuntimeEnv
  Variables: {
    userId: string
    mcpTokenId: string
    mcpTokenName: string
    mcpScopes: McpScope[]
  }
}

const unauthorizedJsonRpc = () => ({
  jsonrpc: '2.0' as const,
  id: null,
  error: {
    code: -32001,
    message: 'Token MCP ausente, inválido, expirado ou revogado'
  }
})

const normalizeScopes = (rawScopes: string[]): McpScope[] => {
  const validSet = new Set<string>(MCP_SCOPES)
  return rawScopes.filter((s): s is McpScope => validSet.has(s))
}

export const mcpAuthMiddleware = createMiddleware<McpAuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(unauthorizedJsonRpc(), 401)
  }

  const plainToken = authHeader.slice(7).trim()
  if (!plainToken.startsWith('dnz_mcp_')) {
    return c.json(unauthorizedJsonRpc(), 401)
  }

  const tokenHash = await hashApiToken(plainToken)
  const now = new Date()
  const db = getDb()

  if (!db) {
    const found = Array.from(mockPersonalApiTokensStore.values()).find(
      (t) => t.tokenHash === tokenHash
    )

    if (!found || found.revokedAt !== null) {
      return c.json(unauthorizedJsonRpc(), 401)
    }

    if (found.expiresAt && new Date(found.expiresAt).getTime() <= now.getTime()) {
      return c.json(unauthorizedJsonRpc(), 401)
    }

    mockPersonalApiTokensStore.set(found.id, {
      ...found,
      lastUsedAt: now.toISOString()
    })

    c.set('userId', found.userId)
    c.set('mcpTokenId', found.id)
    c.set('mcpTokenName', found.name)
    c.set('mcpScopes', normalizeScopes(found.scopes))

    await next()
    return
  }

  try {
    const [tokenRow] = await db
      .select()
      .from(personalApiTokens)
      .where(eq(personalApiTokens.tokenHash, tokenHash))
      .limit(1)

    if (!tokenRow || tokenRow.revokedAt !== null) {
      return c.json(unauthorizedJsonRpc(), 401)
    }

    if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() <= now.getTime()) {
      return c.json(unauthorizedJsonRpc(), 401)
    }

    await db
      .update(personalApiTokens)
      .set({ lastUsedAt: now })
      .where(eq(personalApiTokens.id, tokenRow.id))

    c.set('userId', tokenRow.userId)
    c.set('mcpTokenId', tokenRow.id)
    c.set('mcpTokenName', tokenRow.name)
    c.set('mcpScopes', normalizeScopes(tokenRow.scopes))

    await next()
  } catch {
    return c.json(unauthorizedJsonRpc(), 401)
  }
})
