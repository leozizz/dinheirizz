export interface BankInfo {
  name: string
  code?: string
  primaryColor: string
  secondaryColor?: string
  textColor: string
  initials: string
  slug: string
}

interface BankDefinition {
  slug: string
  name: string
  keywords: string[]
  primaryColor: string
  textColor: string
  initials: string
}

const KNOWN_BANKS: BankDefinition[] = [
  {
    slug: 'nubank',
    name: 'Nubank',
    keywords: ['nubank', 'nu bank', 'roxinho', 'nu pagamentos', 'nu'],
    primaryColor: '#820ad1',
    textColor: '#ffffff',
    initials: 'NU'
  },
  {
    slug: 'itau',
    name: 'Itaú',
    keywords: ['itau', 'itaú', 'itaucard', 'personnalite', 'personalite', 'iti'],
    primaryColor: '#ec7000',
    textColor: '#ffffff',
    initials: 'IT'
  },
  {
    slug: 'bradesco',
    name: 'Bradesco',
    keywords: ['bradesco', 'prime', 'next', 'banco bradesco'],
    primaryColor: '#cc092f',
    textColor: '#ffffff',
    initials: 'BR'
  },
  {
    slug: 'santander',
    name: 'Santander',
    keywords: ['santander', 'select'],
    primaryColor: '#ea1d25',
    textColor: '#ffffff',
    initials: 'ST'
  },
  {
    slug: 'bb',
    name: 'Banco do Brasil',
    keywords: ['banco do brasil', 'bb', 'bancodobrasil'],
    primaryColor: '#fbf700',
    textColor: '#003da5',
    initials: 'BB'
  },
  {
    slug: 'caixa',
    name: 'Caixa',
    keywords: ['caixa', 'caixa economica', 'caixa econômica', 'cef'],
    primaryColor: '#005ca9',
    textColor: '#ffffff',
    initials: 'CX'
  },
  {
    slug: 'inter',
    name: 'Inter',
    keywords: ['inter', 'banco inter'],
    primaryColor: '#ff7a00',
    textColor: '#ffffff',
    initials: 'IN'
  },
  {
    slug: 'c6',
    name: 'C6 Bank',
    keywords: ['c6', 'c6 bank', 'c6bank'],
    primaryColor: '#242424',
    textColor: '#ffffff',
    initials: 'C6'
  },
  {
    slug: 'agibank',
    name: 'Agibank',
    keywords: ['agibank', 'agi bank', 'agi'],
    primaryColor: '#00b4d8',
    textColor: '#ffffff',
    initials: 'AG'
  },
  {
    slug: 'btg',
    name: 'BTG Pactual',
    keywords: ['btg', 'btg pactual', 'pactual'],
    primaryColor: '#001e62',
    textColor: '#ffffff',
    initials: 'BT'
  },
  {
    slug: 'mercadopago',
    name: 'Mercado Pago',
    keywords: ['mercado pago', 'mercadopago', 'mercado livre', 'mp'],
    primaryColor: '#00aae4',
    textColor: '#ffffff',
    initials: 'MP'
  },
  {
    slug: 'pagbank',
    name: 'PagBank',
    keywords: ['pagbank', 'pagseguro', 'pag bank'],
    primaryColor: '#00a868',
    textColor: '#ffffff',
    initials: 'PB'
  },
  {
    slug: 'sicredi',
    name: 'Sicredi',
    keywords: ['sicredi'],
    primaryColor: '#003641',
    textColor: '#ffffff',
    initials: 'SI'
  },
  {
    slug: 'sicoob',
    name: 'Sicoob',
    keywords: ['sicoob'],
    primaryColor: '#003641',
    textColor: '#ffffff',
    initials: 'SC'
  }
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function detectBank(bankOrAccountName?: string | null): BankInfo {
  if (!bankOrAccountName || !bankOrAccountName.trim()) {
    return {
      slug: 'generic',
      name: 'Instituição',
      primaryColor: '#3b82f6',
      textColor: '#ffffff',
      initials: 'B'
    }
  }

  const normalized = normalize(bankOrAccountName)

  for (const b of KNOWN_BANKS) {
    for (const kw of b.keywords) {
      // Verifica correspondência por palavra exata ou inclusão semântica
      const normalizedKw = normalize(kw)
      const regex = new RegExp(`(^|\\s|[^a-z0-9])${normalizedKw}($|\\s|[^a-z0-9])`, 'i')
      if (regex.test(normalized) || normalized === normalizedKw) {
        return {
          slug: b.slug,
          name: b.name,
          primaryColor: b.primaryColor,
          textColor: b.textColor,
          initials: b.initials
        }
      }
    }
  }

  // Fallback com iniciais extraídas do nome informado
  const words = bankOrAccountName.trim().split(/\s+/)
  let initials = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase()

  return {
    slug: 'generic',
    name: 'Instituição',
    primaryColor: '#3b82f6',
    textColor: '#ffffff',
    initials: initials || 'B'
  }
}
