import { describe, it, expect, beforeAll } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../../api/index'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
const adminUserId = '00000000-0000-0000-0000-000000000001'
const regularUserId = '00000000-0000-0000-0000-000000000002'
const targetUserId = '00000000-0000-0000-0000-000000000003'

describe('Endpoints Administrativos de Gestão de Roles e Convites (TDD)', () => {
  let adminToken: string
  let regularToken: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

    adminToken = await sign(
      {
        sub: adminUserId,
        email: 'leonardocps2015@gmail.com', // Admin reconhecido por email
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )

    regularToken = await sign(
      {
        sub: regularUserId,
        email: 'regular.user@dinheirizz.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      TEST_JWT_SECRET,
      'HS256'
    )
  })

  it('GET /api/v1/admin/users deve retornar 401 quando não autenticado', async () => {
    const res = await app.request('/api/v1/admin/users', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/admin/users deve retornar 403 Forbidden para usuário comum', async () => {
    const res = await app.request('/api/v1/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${regularToken}` }
    })
    expect(res.status).toBe(403)
  })

  it('GET /api/v1/admin/users deve retornar 200 e lista de usuários para admin', async () => {
    const res = await app.request('/api/v1/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('users')
    expect(Array.isArray(data.users)).toBe(true)
  })

  it('POST /api/v1/admin/invites deve retornar 403 Forbidden para usuário comum', async () => {
    const res = await app.request('/api/v1/admin/invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${regularToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetUserId, action: 'grant' })
    })
    expect(res.status).toBe(403)
  })

  it('POST /api/v1/admin/invites deve conceder status Pro por convite para admin', async () => {
    const res = await app.request('/api/v1/admin/invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetUserId,
        action: 'grant',
        expiresAt: '2026-12-31T23:59:59Z'
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('concedido')
    expect(data.user.role).toBe('pro')
    expect(data.user.proType).toBe('invited')
  })

  it('POST /api/v1/admin/invites deve revogar status Pro por convite', async () => {
    const res = await app.request('/api/v1/admin/invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetUserId,
        action: 'revoke'
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('revogado')
    expect(data.user.role).toBe('free')
    expect(data.user.proType).toBeNull()
  })

  it('POST /api/v1/admin/invites deve conceder status Pro por e-mail', async () => {
    const res = await app.request('/api/v1/admin/invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'regular.user@dinheirizz.com',
        action: 'grant'
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('concedido')
    expect(data.user.role).toBe('pro')
  })
})

