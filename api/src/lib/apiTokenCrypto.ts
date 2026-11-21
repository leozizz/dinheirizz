const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deriva o hash SHA-256 hexadecimal de um token pessoal usando Web Crypto API.
 */
export const hashApiToken = async (plainTextToken: string): Promise<string> => {
  const encoded = new TextEncoder().encode(plainTextToken)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return toHex(new Uint8Array(digest))
}

export interface GeneratedPersonalToken {
  plainTextToken: string
  tokenPrefix: string
  tokenHash: string
}

/**
 * Gera um token pessoal opaco no formato `dnz_mcp_<48 hex chars>` e seu hash SHA-256.
 */
export const generatePersonalApiToken = async (): Promise<GeneratedPersonalToken> => {
  const randomBytes = new Uint8Array(24)
  crypto.getRandomValues(randomBytes)
  const plainTextToken = `dnz_mcp_${toHex(randomBytes)}`
  const tokenPrefix = `${plainTextToken.slice(0, 12)}...`
  const tokenHash = await hashApiToken(plainTextToken)

  return {
    plainTextToken,
    tokenPrefix,
    tokenHash
  }
}
