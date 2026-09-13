/**
 * Utilitário de segurança e ofuscação de credenciais via WebCrypto API.
 * Nativo, assíncrono, sub-milissegundo e 100% compatível com Edge Runtime (Cloudflare) e navegadores.
 */
export async function hashPasswordClient(password: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return password
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(`dinheirizz:v2:salt:${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
