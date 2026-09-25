import { describe, it, expect } from 'vitest'
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey
} from '../src/services/crypto'

describe('Serviço de Criptografia Edge-Native (WebCrypto + PBKDF2) (TDD)', () => {
  const sampleApiKey = 'AIzaSyB3_example_secret_key_1234567890'
  const customSecret = 'my-super-custom-encryption-master-secret-32-chars'

  it('deve criptografar e decriptografar strings sem corrupção usando WebCrypto AES-GCM + PBKDF2', async () => {
    const encrypted = await encryptApiKey(sampleApiKey, customSecret)

    expect(encrypted).toBeDefined()
    expect(typeof encrypted).toBe('string')
    expect(encrypted).not.toBe(sampleApiKey)
    // Formato deve conter 3 partes separadas por dois pontos: salt:iv:ciphertext
    const parts = encrypted.split(':')
    expect(parts.length).toBe(3)
    expect(parts[0]).toMatch(/^[0-9a-f]+$/i)
    expect(parts[1]).toMatch(/^[0-9a-f]+$/i)
    expect(parts[2]).toMatch(/^[0-9a-f]+$/i)

    const decrypted = await decryptApiKey(encrypted, customSecret)
    expect(decrypted).toBe(sampleApiKey)
  })

  it('deve falhar a decriptação ao utilizar uma chave mestra incorreta', async () => {
    const encrypted = await encryptApiKey(sampleApiKey, customSecret)

    await expect(
      decryptApiKey(encrypted, 'wrong-secret-key-different-hash-test')
    ).rejects.toThrow()
  })

  it('deve falhar a decriptação se o payload estiver truncado ou corrompido', async () => {
    await expect(decryptApiKey('invalid:payload', customSecret)).rejects.toThrow()
    await expect(decryptApiKey('abc:def:invalid_hex_data!', customSecret)).rejects.toThrow()
  })

  it('deve produzir cifras distintas para a mesma entrada devido a salt e IV aleatórios únicos', async () => {
    const enc1 = await encryptApiKey(sampleApiKey, customSecret)
    const enc2 = await encryptApiKey(sampleApiKey, customSecret)

    expect(enc1).not.toBe(enc2)

    const dec1 = await decryptApiKey(enc1, customSecret)
    const dec2 = await decryptApiKey(enc2, customSecret)

    expect(dec1).toBe(sampleApiKey)
    expect(dec2).toBe(sampleApiKey)
  })

  it('deve mascarar a chave de API preservando prefixo e sufixo de segurança', () => {
    const masked = maskApiKey('AIzaSyB3_google_gemini_key_9999')
    expect(masked).toBe('AIzaSy***9999')
    expect(masked).not.toContain('google_gemini_key')

    expect(maskApiKey('12345')).toBe('***45')
    expect(maskApiKey('')).toBe('')
  })
})
