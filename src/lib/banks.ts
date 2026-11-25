export interface BankCardSkin {
  gradient: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  accentColor: string
}

export interface BankInfo {
  name: string
  code?: string
  primaryColor: string
  secondaryColor?: string
  textColor: string
  initials: string
  slug: string
  cardSkin: BankCardSkin
}

interface BankDefinition {
  slug: string
  name: string
  keywords: string[]
  primaryColor: string
  textColor: string
  initials: string
  cardSkin: BankCardSkin
}

const GENERIC_CARD_SKIN: BankCardSkin = {
  gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  textColor: '#ffffff',
  mutedTextColor: 'rgba(255, 255, 255, 0.72)',
  borderColor: 'rgba(255, 255, 255, 0.14)',
  accentColor: '#7bc816'
}

const KNOWN_BANKS: BankDefinition[] = [
  {
    slug: 'nubank',
    name: 'Nubank',
    keywords: ['nubank', 'nu bank', 'roxinho', 'nu pagamentos', 'nu'],
    primaryColor: '#820ad1',
    textColor: '#ffffff',
    initials: 'NU',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #6d08b3 0%, #3b0366 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.74)',
      borderColor: 'rgba(216, 180, 254, 0.22)',
      accentColor: '#a855f7'
    }
  },
  {
    slug: 'itau',
    name: 'Itaú',
    keywords: ['itau', 'itaú', 'itaucard', 'personnalite', 'personalite', 'iti'],
    primaryColor: '#ec7000',
    textColor: '#ffffff',
    initials: 'IT',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #c25700 0%, #002b7a 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(251, 146, 60, 0.28)',
      accentColor: '#ec7000'
    }
  },
  {
    slug: 'bradesco',
    name: 'Bradesco',
    keywords: ['bradesco', 'prime', 'next', 'banco bradesco'],
    primaryColor: '#cc092f',
    textColor: '#ffffff',
    initials: 'BR',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #b9082b 0%, #680418 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(251, 113, 133, 0.25)',
      accentColor: '#e11d48'
    }
  },
  {
    slug: 'santander',
    name: 'Santander',
    keywords: ['santander', 'select'],
    primaryColor: '#ea1d25',
    textColor: '#ffffff',
    initials: 'ST',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #cc092f 0%, #7f061d 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(252, 165, 165, 0.22)',
      accentColor: '#ea1d25'
    }
  },
  {
    slug: 'bb',
    name: 'Banco do Brasil',
    keywords: ['banco do brasil', 'bb', 'bancodobrasil'],
    primaryColor: '#fbf700',
    textColor: '#003da5',
    initials: 'BB',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #003da5 0%, #00266b 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(250, 204, 21, 0.3)',
      accentColor: '#facc15'
    }
  },
  {
    slug: 'caixa',
    name: 'Caixa',
    keywords: ['caixa', 'caixa economica', 'caixa econômica', 'cef'],
    primaryColor: '#005ca9',
    textColor: '#ffffff',
    initials: 'CX',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #005ca9 0%, #003666 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(251, 146, 60, 0.26)',
      accentColor: '#f97316'
    }
  },
  {
    slug: 'inter',
    name: 'Inter',
    keywords: ['inter', 'banco inter'],
    primaryColor: '#ff7a00',
    textColor: '#ffffff',
    initials: 'IN',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #c25100 0%, #7c2d12 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.78)',
      borderColor: 'rgba(253, 186, 116, 0.25)',
      accentColor: '#ff7a00'
    }
  },
  {
    slug: 'c6',
    name: 'C6 Bank',
    keywords: ['c6', 'c6 bank', 'c6bank'],
    primaryColor: '#242424',
    textColor: '#ffffff',
    initials: 'C6',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #262626 0%, #111111 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
      accentColor: '#a3a3a3'
    }
  },
  {
    slug: 'agibank',
    name: 'Agibank',
    keywords: ['agibank', 'agi bank', 'agi'],
    primaryColor: '#00b4d8',
    textColor: '#ffffff',
    initials: 'AG',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #0077b6 0%, #023e8a 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(144, 224, 239, 0.25)',
      accentColor: '#00b4d8'
    }
  },
  {
    slug: 'btg',
    name: 'BTG Pactual',
    keywords: ['btg', 'btg pactual', 'pactual'],
    primaryColor: '#001e62',
    textColor: '#ffffff',
    initials: 'BT',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #0f172a 0%, #001e62 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.74)',
      borderColor: 'rgba(96, 165, 250, 0.24)',
      accentColor: '#3b82f6'
    }
  },
  {
    slug: 'xp',
    name: 'XP Investimentos',
    keywords: ['xp', 'xp investimentos', 'banco xp'],
    primaryColor: '#18181b',
    textColor: '#ffffff',
    initials: 'XP',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.72)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      accentColor: '#eab308'
    }
  },
  {
    slug: 'neon',
    name: 'Neon',
    keywords: ['neon', 'banco neon'],
    primaryColor: '#0088cc',
    textColor: '#ffffff',
    initials: 'NE',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #0077b3 0%, #004466 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(56, 189, 248, 0.28)',
      accentColor: '#00aaff'
    }
  },
  {
    slug: 'picpay',
    name: 'PicPay',
    keywords: ['picpay', 'pic pay'],
    primaryColor: '#0b8a42',
    textColor: '#ffffff',
    initials: 'PP',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #0b8a42 0%, #064e25 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(74, 222, 128, 0.26)',
      accentColor: '#21c25e'
    }
  },
  {
    slug: 'mercadopago',
    name: 'Mercado Pago',
    keywords: ['mercado pago', 'mercadopago', 'mercado livre', 'mp'],
    primaryColor: '#00aae4',
    textColor: '#ffffff',
    initials: 'MP',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #007eb5 0%, #004c6d 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(125, 211, 252, 0.25)',
      accentColor: '#00aae4'
    }
  },
  {
    slug: 'pagbank',
    name: 'PagBank',
    keywords: ['pagbank', 'pagseguro', 'pag bank'],
    primaryColor: '#00a868',
    textColor: '#ffffff',
    initials: 'PB',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #008a55 0%, #004d30 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.76)',
      borderColor: 'rgba(110, 231, 183, 0.24)',
      accentColor: '#00a868'
    }
  },
  {
    slug: 'sicredi',
    name: 'Sicredi',
    keywords: ['sicredi'],
    primaryColor: '#003641',
    textColor: '#ffffff',
    initials: 'SI',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #004d2b 0%, #002917 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(134, 239, 172, 0.24)',
      accentColor: '#64b42d'
    }
  },
  {
    slug: 'sicoob',
    name: 'Sicoob',
    keywords: ['sicoob'],
    primaryColor: '#003641',
    textColor: '#ffffff',
    initials: 'SC',
    cardSkin: {
      gradient: 'linear-gradient(135deg, #003641 0%, #001f26 100%)',
      textColor: '#ffffff',
      mutedTextColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(94, 234, 212, 0.22)',
      accentColor: '#00ae9d'
    }
  }
]

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

export const detectBank = (bankOrAccountName?: string | null): BankInfo => {
  if (!bankOrAccountName || !bankOrAccountName.trim()) {
    return {
      slug: 'generic',
      name: 'Instituição',
      primaryColor: '#3b82f6',
      textColor: '#ffffff',
      initials: 'B',
      cardSkin: GENERIC_CARD_SKIN
    }
  }

  const normalized = normalize(bankOrAccountName)

  for (const b of KNOWN_BANKS) {
    for (const kw of b.keywords) {
      const normalizedKw = normalize(kw)
      const regex = new RegExp(`(^|\\s|[^a-z0-9])${normalizedKw}($|\\s|[^a-z0-9])`, 'i')
      if (regex.test(normalized) || normalized === normalizedKw) {
        return {
          slug: b.slug,
          name: b.name,
          primaryColor: b.primaryColor,
          textColor: b.textColor,
          initials: b.initials,
          cardSkin: b.cardSkin
        }
      }
    }
  }

  const words = bankOrAccountName.trim().split(/\s+/)
  const initials = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase()

  return {
    slug: 'generic',
    name: 'Instituição',
    primaryColor: '#3b82f6',
    textColor: '#ffffff',
    initials: initials || 'B',
    cardSkin: GENERIC_CARD_SKIN
  }
}
