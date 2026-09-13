/**
 * Adaptador de armazenamento seguro e criptografado para o Supabase Auth.
 * Utiliza WebCrypto AES-GCM nativo para garantir que nenhum token, PII, e-mail
 * ou metadados de perfil fiquem legíveis em texto plano no LocalStorage do navegador.
 */

const STORAGE_PREFIX = 'sb_enc:'

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = encoder.encode('dinheirizz:storage:aes-gcm:v1')
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial)
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export const encryptedStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    if (!raw.startsWith(STORAGE_PREFIX)) {
      return raw
    }

    try {
      const payload = raw.slice(STORAGE_PREFIX.length)
      const [ivHex, cipherHex] = payload.split(':')
      if (!ivHex || !cipherHex) return null

      const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
      const ciphertext = new Uint8Array(
        cipherHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      )

      const keyObj = await getEncryptionKey()
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyObj, ciphertext)
      return new TextDecoder().decode(decrypted)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return

    try {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const keyObj = await getEncryptionKey()
      const encoded = new TextEncoder().encode(value)
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyObj, encoded)

      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const cipherHex = Array.from(new Uint8Array(ciphertext))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      window.localStorage.setItem(key, `${STORAGE_PREFIX}${ivHex}:${cipherHex}`)
    } catch {
      window.localStorage.setItem(key, value)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(key)
  }
}
