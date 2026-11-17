import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getVapidPublicKey,
  createVapidAuthHeader,
  encryptWebPushPayload,
  sendWebPushNotification,
  type WebPushSubscription,
  type WebPushPayload
} from '../src/services/webPush'

describe('WebPush Edge-Native Service (TDD)', () => {
  // Chaves mock para teste (P-256 raw 65 bytes uncompressed e auth 16 bytes)
  const mockSubscription: WebPushSubscription = {
    endpoint: 'https://push.example.com/notify/client-token-123',
    p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjGwVQKYnetOXTD8143bqQqLDATmx=',
    auth: '5A1tSecretAuthKey1234=='
  }

  const mockPayload: WebPushPayload = {
    title: 'Conta a vencer amanhã!',
    body: 'Aluguel vence em 24h.',
    data: { url: '/transactions' }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getVapidPublicKey', () => {
    it('deve retornar chave pública VAPID em base64url', () => {
      const publicKey = getVapidPublicKey()
      expect(typeof publicKey).toBe('string')
      expect(publicKey.length).toBeGreaterThan(20)
    })
  })

  describe('createVapidAuthHeader', () => {
    it('deve gerar header de autorização VAPID com JWT assinado e chave pública', async () => {
      const audience = 'https://push.example.com'
      const header = await createVapidAuthHeader(audience)

      expect(header).toMatch(/^vapid t=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+, k=[A-Za-z0-9_-]+$/)
    })
  })

  describe('encryptWebPushPayload', () => {
    it('deve cifrar payload gerando body binário e headers aes128gcm', async () => {
      // Gerar uma chave ECDH válida para testar cifragem real com WebCrypto
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      )
      const rawPublic = await crypto.subtle.exportKey('raw', keyPair.publicKey)
      const base64UrlPublic = btoa(String.fromCharCode(...new Uint8Array(rawPublic)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const validSub: WebPushSubscription = {
        endpoint: mockSubscription.endpoint,
        p256dh: base64UrlPublic,
        auth: 'dGVzdGF1dGhzZWNyZXQ='
      }

      const result = await encryptWebPushPayload(validSub, mockPayload)

      expect(result.headers['Content-Type']).toBe('application/octet-stream')
      expect(result.headers['Content-Encoding']).toBe('aes128gcm')
      expect(result.body.byteLength).toBeGreaterThan(0)
    })
  })

  describe('sendWebPushNotification', () => {
    it('deve retornar sucesso quando o servidor push responder 201', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 201, statusText: 'Created' })
      )

      const result = await sendWebPushNotification(mockSubscription, mockPayload)
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(201)
      expect(result.expired).toBeFalsy()
    })

    it('deve retornar expired: true quando o servidor push responder 410 Gone', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 410, statusText: 'Gone' })
      )

      const result = await sendWebPushNotification(mockSubscription, mockPayload)
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(410)
      expect(result.expired).toBe(true)
    })

    it('deve retornar expired: true quando o servidor push responder 404 Not Found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 404, statusText: 'Not Found' })
      )

      const result = await sendWebPushNotification(mockSubscription, mockPayload)
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(404)
      expect(result.expired).toBe(true)
    })

    it('deve tratar erros de rede sem disparar exceção não capturada', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const result = await sendWebPushNotification(mockSubscription, mockPayload)
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(500)
      expect(result.error).toBeDefined()
    })
  })
})
