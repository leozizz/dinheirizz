import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BankLogo } from '../components/banks/BankLogo'
import { CardBrandLogo } from '../components/banks/CardBrandLogo'
import type { CreditCardBrand } from '../schemas/creditCards'

const KNOWN_SLUGS: Array<{ slug: string; name: string }> = [
  { slug: 'nubank', name: 'Nubank' },
  { slug: 'itau', name: 'Itaú' },
  { slug: 'bradesco', name: 'Bradesco' },
  { slug: 'santander', name: 'Santander' },
  { slug: 'bb', name: 'Banco do Brasil' },
  { slug: 'caixa', name: 'Caixa' },
  { slug: 'inter', name: 'Inter' },
  { slug: 'c6', name: 'C6 Bank' },
  { slug: 'agibank', name: 'Agibank' },
  { slug: 'btg', name: 'BTG Pactual' },
  { slug: 'xp', name: 'XP Investimentos' },
  { slug: 'neon', name: 'Neon' },
  { slug: 'picpay', name: 'PicPay' },
  { slug: 'mercadopago', name: 'Mercado Pago' },
  { slug: 'pagbank', name: 'PagBank' },
  { slug: 'sicredi', name: 'Sicredi' },
  { slug: 'sicoob', name: 'Sicoob' }
]

describe('BankLogo Component (TDD)', () => {
  it('renderiza SVG vetorial offline com data-testid e aria-label para todos os bancos conhecidos', () => {
    for (const bank of KNOWN_SLUGS) {
      const { unmount } = render(
        <BankLogo slug={bank.slug} name={bank.name} initials="XX" />
      )

      const logo = screen.getByTestId(`bank-logo-${bank.slug}`)
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('aria-label', `Logo ${bank.name}`)
      const svg = logo.querySelector('svg')
      expect(svg).not.toBeNull()

      unmount()
    }
  })

  it('renderiza fallback em monograma estilizado com initials para banco genérico', () => {
    render(<BankLogo slug="generic" name="Carteira Física" initials="CF" />)

    const logo = screen.getByTestId('bank-logo-generic')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('aria-label', 'Logo Carteira Física')
    expect(logo.textContent).toContain('CF')
  })

  it('suporta props size, variant e className', () => {
    render(
      <BankLogo
        slug="nubank"
        name="Nubank"
        size="lg"
        variant="card"
        className="custom-test-class"
      />
    )

    const logo = screen.getByTestId('bank-logo-nubank')
    expect(logo.className).toContain('custom-test-class')
  })

  it('garante contraste WCAG AA no variant="badge" para bancos escuros e amarelos em ambos os temas', () => {
    const { rerender } = render(
      <BankLogo slug="xp" name="XP Investimentos" primaryColor="#18181b" variant="badge" />
    )
    const xpLogo = screen.getByTestId('bank-logo-xp')
    expect(xpLogo.style.backgroundColor).toBe('rgb(24, 24, 27)')
    expect(xpLogo.style.color).toBe('rgb(255, 255, 255)')

    rerender(
      <BankLogo slug="bb" name="Banco do Brasil" primaryColor="#fbf700" variant="badge" />
    )
    const bbLogo = screen.getByTestId('bank-logo-bb')
    expect(bbLogo.style.backgroundColor).toBe('rgb(251, 247, 0)')
    expect(bbLogo.style.color).toBe('rgb(15, 23, 42)')
  })
})

describe('CardBrandLogo Component (TDD)', () => {
  const brands: CreditCardBrand[] = [
    'mastercard',
    'visa',
    'elo',
    'amex',
    'hipercard',
    'other'
  ]

  it('renderiza emblema vetorial com data-testid="credit-card-brand" para todas as bandeiras', () => {
    for (const brand of brands) {
      const { unmount } = render(<CardBrandLogo brand={brand} />)

      const badge = screen.getByTestId('credit-card-brand')
      expect(badge).toBeInTheDocument()
      expect(badge.textContent?.toLowerCase()).toContain(brand)
      const svg = badge.querySelector('svg')
      expect(svg).not.toBeNull()

      unmount()
    }
  })
})
