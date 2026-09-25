/**
 * Utilitário universal de criptografia simétrica Edge-Native
 * Utiliza WebCrypto API nativa (crypto.subtle), PBKDF2 (SHA-256) e AES-GCM (256-bit).
 * Totalmente compatível com Cloudflare Pages/Workers, Node.js e Browsers modernos.
 */

const DEFAULT_MASTER_SECRET =
  process.env.AI_ENCRYPTION_KEY || 'dinheirizz-default-encryption-master-secret-key-32-chars'

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    return globalThis.crypto.subtle
  }
  throw new Error('WebCrypto API (crypto.subtle) não está disponível neste ambiente.')
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('String hex inválida com tamanho ímpar.')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function deriveAesKey(
  secret: string,
  salt: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()
  const baseKey = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  )
}

/**
 * Criptografa uma string usando AES-256-GCM com salt e IV randômicos
 * Retorna formato: salt_hex:iv_hex:ciphertext_hex
 */
export async function encryptApiKey(
  plainText: string,
  masterSecret: string = DEFAULT_MASTER_SECRET
): Promise<string> {
  if (!plainText) return ''

  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()

  // 16 bytes de salt para PBKDF2 e 12 bytes de IV para AES-GCM
  const salt = new Uint8Array(16)
  const iv = new Uint8Array(12)
  globalThis.crypto.getRandomValues(salt)
  globalThis.crypto.getRandomValues(iv)

  const key = await deriveAesKey(masterSecret, salt, ['encrypt'])
  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  )

  return `${bufferToHex(salt)}:${bufferToHex(iv)}:${bufferToHex(encryptedBuffer)}`
}

/**
 * Decriptografa uma string gerada por encryptApiKey
 */
export async function decryptApiKey(
  encryptedPayload: string,
  masterSecret: string = DEFAULT_MASTER_SECRET
): Promise<string> {
  if (!encryptedPayload) return ''

  const parts = encryptedPayload.split(':')
  if (parts.length !== 3) {
    throw new Error('Payload criptográfico inválido: esperado formato salt:iv:ciphertext')
  }

  const [saltHex, ivHex, ciphertextHex] = parts
  const salt = hexToUint8Array(saltHex)
  const iv = hexToUint8Array(ivHex)
  const ciphertext = hexToUint8Array(ciphertextHex)

  const subtle = getSubtleCrypto()
  const key = await deriveAesKey(masterSecret, salt, ['decrypt'])

  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decryptedBuffer)
}

/**
 * Mascara uma chave de API para exibição segura no frontend sem vazar o corpo
 * Ex: "AIzaSyB3_example_key_9999" -> "AIzaSy***9999"
 */
export function maskApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) return ''
  const trimmed = apiKey.trim()
  if (!trimmed) return ''

  if (trimmed.length >= 10) {
    const prefix = trimmed.slice(0, 6)
    const suffix = trimmed.slice(-4)
    return `${prefix}***${suffix}`
  }

  if (trimmed.length >= 4) {
    return `***${trimmed.slice(-2)}`
  }

  return '***'
}
