import { describe, it, expect } from 'vitest'
import app from '../index'

describe('BFF Transactions & Categories API', () => {
  describe('GET /api/v1/transactions', () => {
    it('deve retornar 200 e lista de transações mockada', async () => {
      const res = await app.request('/api/v1/transactions')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0]).toHaveProperty('amount')
    })
  })

  describe('POST /api/v1/transactions', () => {
    it('deve cadastrar uma transação válida e retornar 201', async () => {
      const payload = {
        amount: 89.90,
        description: 'Supermercado Mensal',
        paid: true
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('amount', '89.90')
      expect(data).toHaveProperty('description', 'Supermercado Mensal')
    })

    it('deve rejeitar transação com amount negativo ou zero retornando status 400', async () => {
      const invalidPayload = {
        amount: -50.00,
        description: 'Valor Inválido'
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
      })

      expect(res.status).toBe(400)
      const errorData = await res.json()
      expect(errorData).toHaveProperty('error')
      expect(errorData.error).toContain('inválido')
    })

    it('deve rejeitar transação sem campo amount retornando status 400', async () => {
      const missingPayload = {
        description: 'Sem Valor'
      }

      const res = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missingPayload)
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/v1/categories', () => {
    it('deve retornar 200 com lista de categorias ativas', async () => {
      const res = await app.request('/api/v1/categories')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
    })
  })
})
