import { Hono } from 'hono'
import { getDb } from '../db/client'
import { mcpAuditLogs } from '../db/schema'
import type { McpAuthEnv } from '../middlewares/mcpAuth'
import { mockMcpAuditLogsStore } from './apiTokens'
import { mcpJsonRpcRequestSchema, mcpToolCallParamsSchema } from '../schemas/mcp'
import {
  executeMcpTool,
  MCP_TOOL_DEFINITIONS,
  McpInvalidParamsError
} from '../services/mcpTools'

export const mcpRouter = new Hono<McpAuthEnv>()

const jsonRpcSuccess = (id: string | number | null, result: unknown) => ({
  jsonrpc: '2.0' as const,
  id,
  result
})

const jsonRpcError = (id: string | number | null, code: number, message: string) => ({
  jsonrpc: '2.0' as const,
  id,
  error: {
    code,
    message
  }
})

const recordAuditLog = async (
  tokenId: string,
  userId: string,
  toolName: string,
  status: 'success' | 'forbidden' | 'error'
): Promise<void> => {
  const db = getDb()
  if (!db) {
    const id = crypto.randomUUID()
    mockMcpAuditLogsStore.set(id, {
      id,
      tokenId,
      userId,
      toolName,
      status,
      createdAt: new Date().toISOString()
    })
    return
  }

  try {
    await db.insert(mcpAuditLogs).values({
      tokenId,
      userId,
      toolName,
      status
    })
  } catch {
    // Falha ao gravar log de auditoria não deve interromper a resposta MCP
  }
}

mcpRouter.post('/', async (c) => {
  const rawBody = await c.req.json().catch(() => null)
  const parsed = mcpJsonRpcRequestSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(jsonRpcError(null, -32600, 'Invalid Request'), 400)
  }

  const { id = null, method, params } = parsed.data
  const userId = c.get('userId')
  const tokenId = c.get('mcpTokenId')
  const mcpScopes = c.get('mcpScopes')

  if (method === 'notifications/initialized') {
    return c.body(null, 202)
  }

  if (method === 'initialize') {
    return c.json(
      jsonRpcSuccess(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'dinheirizz-mcp', version: '1.0.0' }
      })
    )
  }

  if (method === 'ping') {
    return c.json(jsonRpcSuccess(id, {}))
  }

  if (method === 'tools/list') {
    return c.json(
      jsonRpcSuccess(id, {
        tools: MCP_TOOL_DEFINITIONS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      })
    )
  }

  if (method === 'tools/call') {
    const callParsed = mcpToolCallParamsSchema.safeParse(params ?? {})
    if (!callParsed.success) {
      return c.json(jsonRpcError(id, -32602, 'Invalid params'))
    }

    const { name, arguments: toolArgs } = callParsed.data
    const toolDef = MCP_TOOL_DEFINITIONS.find((t) => t.name === name)

    if (!toolDef) {
      return c.json(jsonRpcError(id, -32601, `Tool não encontrada: ${name}`))
    }

    if (!mcpScopes.includes(toolDef.requiredScope)) {
      await recordAuditLog(tokenId, userId, name, 'forbidden')
      return c.json(
        jsonRpcSuccess(id, {
          content: [
            {
              type: 'text',
              text: `Escopo insuficiente: requer ${toolDef.requiredScope}`
            }
          ],
          isError: true
        })
      )
    }

    try {
      const result = await executeMcpTool(name, toolArgs, userId)
      await recordAuditLog(tokenId, userId, name, 'success')
      return c.json(
        jsonRpcSuccess(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ],
          isError: false
        })
      )
    } catch (error: unknown) {
      if (error instanceof McpInvalidParamsError) {
        return c.json(jsonRpcError(id, -32602, error.message))
      }

      await recordAuditLog(tokenId, userId, name, 'error')
      const message = error instanceof Error ? error.message : 'Erro interno ao executar tool'
      return c.json(
        jsonRpcSuccess(id, {
          content: [
            {
              type: 'text',
              text: message
            }
          ],
          isError: true
        })
      )
    }
  }

  return c.json(jsonRpcError(id, -32601, `Método não suportado: ${method}`))
})
