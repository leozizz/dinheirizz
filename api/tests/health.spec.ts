import { describe, it, expect } from 'vitest'
import app from '../index'

describe('GET /api/health', () => {
  it('deve retornar status 200 com status "ok" e versão "2.0.0"', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('version', '2.0.0')
    expect(data).toHaveProperty('timestamp')
  })
})
