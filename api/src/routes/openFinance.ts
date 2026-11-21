import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { openFinanceAccountLinks, openFinanceConnections } from '../db/schema'
import type { AuthEnv } from '../middlewares/auth'
import { parseProfileIdQuery, resolveUserProfileId } from '../lib/profileFilter'
import {
  connectTokenRequestSchema,
  createConnectionRequestSchema,
  openFinanceProviderSchema,
  webhookEventSchema,
  type OpenFinanceProvider
} from '../schemas/openFinance'
import {
  getOpenFinanceAdapter,
  OpenFinanceConfigError,
  verifyHmacSha256Signature
} from '../services/openFinance'
import {
  mockOpenFinanceAccountLinksStore,
  mockOpenFinanceConnectionsStore,
  syncOpenFinanceConnection,
  type MockOpenFinanceConnection
} from '../services/openFinanceSync'

export {
  mockOpenFinanceConnectionsStore,
  mockOpenFinanceAccountLinksStore
}

export const openFinanceRouter = new Hono<AuthEnv>()

// POST /api/v1/open-finance/connect-token
openFinanceRouter.post('/connect-token', async (c) => {
  const userId = c.get('userId')

  let body: unknown = {}
  try {
    const raw = await c.req.text()
    if (raw.trim()) {
      body = JSON.parse(raw)
    }
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = connectTokenRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  try {
    const adapter = getOpenFinanceAdapter(parsed.data.provider, c.env)
    const tokenResult = await adapter.createConnectToken({
      userId,
      itemId: parsed.data.itemId
    })
    return c.json(tokenResult, 200)
  } catch (error: unknown) {
    if (error instanceof OpenFinanceConfigError) {
      return c.json(
        {
          error: 'Provedor Open Finance não configurado',
          message: error.message
        },
        503
      )
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao gerar token de conexão Open Finance', details: message },
      500
    )
  }
})

// POST /api/v1/open-finance/connections
openFinanceRouter.post('/connections', async (c) => {
  const userId = c.get('userId')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const parsed = createConnectionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: parsed.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        }))
      },
      400
    )
  }

  const {
    provider,
    externalItemId,
    institutionId,
    institutionName,
    institutionLogoUrl,
    profileId
  } = parsed.data

  try {
    const adapter = getOpenFinanceAdapter(provider, c.env)
    const db = getDb()
    const profileResolution = await resolveUserProfileId(db, userId, profileId)
    if (!profileResolution.ok) {
      return c.json({ error: profileResolution.error }, profileResolution.status)
    }
    const resolvedProfileId = profileResolution.profileId

    if (!db) {
      const existing = Array.from(mockOpenFinanceConnectionsStore.values()).find(
        (conn) =>
          conn.provider === provider && conn.externalItemId === externalItemId
      )

      const connId = existing?.id ?? crypto.randomUUID()
      const nowIso = new Date().toISOString()
      const connRecord: MockOpenFinanceConnection = {
        id: connId,
        userId,
        profileId: resolvedProfileId,
        provider,
        externalItemId,
        institutionId,
        institutionName,
        institutionLogoUrl: institutionLogoUrl ?? null,
        status: 'active',
        consentScope: 'read_only',
        consentExpiresAt: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        lastSyncAt: nowIso,
        lastError: null,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso
      }
      mockOpenFinanceConnectionsStore.set(connId, connRecord)

      const syncSummary = await syncOpenFinanceConnection({
        connectionId: connId,
        userId,
        adapter
      })

      return c.json(
        {
          connection: {
            id: connRecord.id,
            provider: connRecord.provider,
            institutionId: connRecord.institutionId,
            institutionName: connRecord.institutionName,
            status: connRecord.status,
            consentScope: connRecord.consentScope,
            lastSyncAt: connRecord.lastSyncAt
          },
          syncSummary
        },
        201
      )
    }

    const [created] = await db
      .insert(openFinanceConnections)
      .values({
        userId,
        profileId: resolvedProfileId,
        provider,
        externalItemId,
        institutionId,
        institutionName,
        institutionLogoUrl: institutionLogoUrl ?? null,
        status: 'active',
        consentScope: 'read_only',
        consentExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      })
      .returning()

    const syncSummary = await syncOpenFinanceConnection({
      connectionId: created.id,
      userId,
      adapter
    })

    const [refreshed] = await db
      .select()
      .from(openFinanceConnections)
      .where(eq(openFinanceConnections.id, created.id))
      .limit(1)

    return c.json(
      {
        connection: {
          id: refreshed.id,
          provider: refreshed.provider,
          institutionId: refreshed.institutionId,
          institutionName: refreshed.institutionName,
          status: refreshed.status,
          consentScope: refreshed.consentScope,
          lastSyncAt: refreshed.lastSyncAt?.toISOString() ?? null
        },
        syncSummary
      },
      201
    )
  } catch (error: unknown) {
    if (error instanceof OpenFinanceConfigError) {
      return c.json(
        {
          error: 'Provedor Open Finance não configurado',
          message: error.message
        },
        503
      )
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao registrar conexão Open Finance', details: message },
      500
    )
  }
})

// GET /api/v1/open-finance/connections
openFinanceRouter.get('/connections', async (c) => {
  const userId = c.get('userId')
  const parsedProfile = parseProfileIdQuery(c.req.query('profileId'))
  if (!parsedProfile.valid) {
    return c.json({ error: 'Parâmetro profileId inválido' }, 400)
  }

  const db = getDb()

  if (!db) {
    const connections = Array.from(mockOpenFinanceConnectionsStore.values())
      .filter(
        (conn) =>
          conn.userId === userId &&
          (!parsedProfile.profileId || conn.profileId === parsedProfile.profileId)
      )
      .map((conn) => {
        const linkedAccounts = Array.from(
          mockOpenFinanceAccountLinksStore.values()
        ).filter((l) => l.connectionId === conn.id)
        return {
          ...conn,
          linkedAccounts
        }
      })

    return c.json({ data: connections, total: connections.length }, 200)
  }

  try {
    const whereClause = parsedProfile.profileId
      ? and(
          eq(openFinanceConnections.userId, userId),
          eq(openFinanceConnections.profileId, parsedProfile.profileId)
        )
      : eq(openFinanceConnections.userId, userId)

    const connections = await db
      .select()
      .from(openFinanceConnections)
      .where(whereClause)
      .orderBy(desc(openFinanceConnections.createdAt))

    const links = await db
      .select()
      .from(openFinanceAccountLinks)
      .where(eq(openFinanceAccountLinks.userId, userId))

    const data = connections.map((conn) => ({
      ...conn,
      consentExpiresAt: conn.consentExpiresAt?.toISOString() ?? null,
      lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt?.toISOString() ?? null,
      linkedAccounts: links.filter((l) => l.connectionId === conn.id)
    }))

    return c.json({ data, total: data.length }, 200)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao listar conexões Open Finance', details: message },
      500
    )
  }
})

// POST /api/v1/open-finance/connections/:id/sync
openFinanceRouter.post('/connections/:id/sync', async (c) => {
  const userId = c.get('userId')
  const connectionId = c.req.param('id')
  const db = getDb()

  try {
    let provider: OpenFinanceProvider = 'sandbox'

    if (!db) {
      const conn = mockOpenFinanceConnectionsStore.get(connectionId)
      if (!conn || conn.userId !== userId) {
        return c.json({ error: 'Conexão Open Finance não encontrada' }, 404)
      }
      if (conn.status === 'revoked') {
        return c.json({ error: 'Conexão já foi revogada' }, 400)
      }
      const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
      provider = parsedProv.success ? parsedProv.data : 'sandbox'
    } else {
      const [conn] = await db
        .select()
        .from(openFinanceConnections)
        .where(
          and(
            eq(openFinanceConnections.id, connectionId),
            eq(openFinanceConnections.userId, userId)
          )
        )
        .limit(1)
      if (!conn) {
        return c.json({ error: 'Conexão Open Finance não encontrada' }, 404)
      }
      if (conn.status === 'revoked') {
        return c.json({ error: 'Conexão já foi revogada' }, 400)
      }
      const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
      provider = parsedProv.success ? parsedProv.data : 'sandbox'
    }

    const adapter = getOpenFinanceAdapter(provider, c.env)
    const syncSummary = await syncOpenFinanceConnection({
      connectionId,
      userId,
      adapter
    })

    return c.json(
      {
        connectionId,
        status: 'active',
        lastSyncAt: new Date().toISOString(),
        syncSummary
      },
      200
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao sincronizar conexão Open Finance', details: message },
      500
    )
  }
})

// DELETE /api/v1/open-finance/connections/:id
openFinanceRouter.delete('/connections/:id', async (c) => {
  const userId = c.get('userId')
  const connectionId = c.req.param('id')
  const db = getDb()

  try {
    if (!db) {
      const conn = mockOpenFinanceConnectionsStore.get(connectionId)
      if (!conn || conn.userId !== userId) {
        return c.json({ error: 'Conexão Open Finance não encontrada' }, 404)
      }
      const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
      const adapter = getOpenFinanceAdapter(
        parsedProv.success ? parsedProv.data : 'sandbox',
        c.env
      )
      await adapter.revokeItem(conn.externalItemId)
      conn.status = 'revoked'
      conn.updatedAt = new Date().toISOString()

      return c.json({ revoked: true, id: connectionId, status: 'revoked' }, 200)
    }

    const [conn] = await db
      .select()
      .from(openFinanceConnections)
      .where(
        and(
          eq(openFinanceConnections.id, connectionId),
          eq(openFinanceConnections.userId, userId)
        )
      )
      .limit(1)

    if (!conn) {
      return c.json({ error: 'Conexão Open Finance não encontrada' }, 404)
    }

    const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
    const adapter = getOpenFinanceAdapter(
      parsedProv.success ? parsedProv.data : 'sandbox',
      c.env
    )
    await adapter.revokeItem(conn.externalItemId)

    await db
      .update(openFinanceConnections)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(openFinanceConnections.id, connectionId))

    return c.json({ revoked: true, id: connectionId, status: 'revoked' }, 200)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao revogar conexão Open Finance', details: message },
      500
    )
  }
})

// POST /api/v1/open-finance/webhook (Público, protegido por assinatura HMAC-SHA256)
openFinanceRouter.post('/webhook', async (c) => {
  const rawBody = await c.req.text()
  const signature =
    c.req.header('x-pluggy-signature') ?? c.req.header('x-open-finance-signature')

  const pluggySecret =
    c.env?.PLUGGY_WEBHOOK_SECRET ?? process.env.PLUGGY_WEBHOOK_SECRET
  const belvoSecret =
    c.env?.BELVO_WEBHOOK_SECRET ?? process.env.BELVO_WEBHOOK_SECRET

  const validPluggy = await verifyHmacSha256Signature(
    rawBody,
    signature,
    pluggySecret
  )
  const validBelvo = await verifyHmacSha256Signature(
    rawBody,
    signature,
    belvoSecret
  )

  if (!validPluggy && !validBelvo) {
    return c.json({ error: 'Assinatura de webhook inválida ou ausente' }, 401)
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'Payload JSON inválido' }, 400)
  }

  const parsedEvent = webhookEventSchema.safeParse(parsedJson)
  if (!parsedEvent.success) {
    return c.json({ error: 'Evento de webhook inválido' }, 400)
  }

  const { itemId } = parsedEvent.data
  const db = getDb()

  try {
    if (!db) {
      const conn = Array.from(mockOpenFinanceConnectionsStore.values()).find(
        (item) => item.externalItemId === itemId && item.status !== 'revoked'
      )
      if (conn) {
        const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
        const adapter = getOpenFinanceAdapter(
          parsedProv.success ? parsedProv.data : 'sandbox',
          c.env
        )
        await syncOpenFinanceConnection({
          connectionId: conn.id,
          userId: conn.userId,
          adapter
        })
      }
      return c.json({ received: true, processed: true }, 200)
    }

    const [conn] = await db
      .select()
      .from(openFinanceConnections)
      .where(eq(openFinanceConnections.externalItemId, itemId))
      .limit(1)

    if (conn && conn.status !== 'revoked') {
      const parsedProv = openFinanceProviderSchema.safeParse(conn.provider)
      const adapter = getOpenFinanceAdapter(
        parsedProv.success ? parsedProv.data : 'sandbox',
        c.env
      )
      await syncOpenFinanceConnection({
        connectionId: conn.id,
        userId: conn.userId,
        adapter
      })
    }

    return c.json({ received: true, processed: true }, 200)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return c.json(
      { error: 'Falha ao processar webhook Open Finance', details: message },
      500
    )
  }
})
