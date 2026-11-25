import type { ReactElement } from 'react'
import type { CreditCardBrand } from '../../schemas/creditCards'

export interface CardBrandLogoProps {
  brand: CreditCardBrand
  className?: string
}

const BRAND_LABELS: Record<CreditCardBrand, string> = {
  mastercard: 'Mastercard',
  visa: 'Visa',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  other: 'Cartão'
}

const BRAND_SVGS: Record<CreditCardBrand, () => ReactElement> = {
  mastercard: () => (
    <svg viewBox="0 0 36 22" className="w-8 h-5" fill="none" aria-hidden="true">
      <circle cx="13" cy="11" r="8" fill="#EB001B" fillOpacity="0.92" />
      <circle cx="23" cy="11" r="8" fill="#F79E1B" fillOpacity="0.92" />
      <path
        d="M18 4.7a8 8 0 0 0 0 12.6 8 8 0 0 0 0-12.6Z"
        fill="#FF5F00"
      />
    </svg>
  ),
  visa: () => (
    <svg viewBox="0 0 42 18" className="w-9 h-4" fill="none" aria-hidden="true">
      <path
        d="M4 3.5L7.6 14.5H10.1L13.7 3.5H11.3L8.9 11.4L6.4 3.5H4ZM15.5 3.5V14.5H17.8V3.5H15.5ZM25.2 6.2C24.4 5.7 23.4 5.5 22.3 5.5C20.2 5.5 18.8 6.7 18.8 8.3C18.8 9.8 19.9 10.6 21.5 11.1C22.6 11.5 23.1 11.8 23.1 12.4C23.1 13.1 22.3 13.5 21.2 13.5C20.1 13.5 19.1 13.2 18.4 12.7L17.7 14.5C18.5 14.9 19.8 15.2 21.1 15.2C23.5 15.2 25.1 14 25.1 12.2C25.1 10.6 24 9.8 22.3 9.2C21.3 8.9 20.8 8.6 20.8 8C20.8 7.5 21.4 7.1 22.3 7.1C23.2 7.1 24 7.3 24.6 7.7L25.2 6.2ZM30.8 3.5L27 14.5H29.3L30.1 12H33.5L34.3 14.5H36.6L32.8 3.5H30.8ZM30.7 10.2L31.8 6.4L32.9 10.2H30.7Z"
        fill="currentColor"
      />
    </svg>
  ),
  elo: () => (
    <svg viewBox="0 0 40 20" className="w-9 h-5" fill="none" aria-hidden="true">
      <circle cx="8" cy="10" r="4.5" stroke="#FFCB05" strokeWidth="2.4" />
      <circle cx="19" cy="10" r="4.5" stroke="#00A4E0" strokeWidth="2.4" />
      <circle cx="30" cy="10" r="4.5" stroke="#EF4123" strokeWidth="2.4" />
    </svg>
  ),
  amex: () => (
    <svg viewBox="0 0 38 20" className="w-9 h-5" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="36" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.8" />
      <path
        d="M8.5 14L11.5 6H13.8L16.8 14H14.6L14 12.2H11.3L10.7 14H8.5ZM11.8 10.6H13.5L12.65 8.1L11.8 10.6ZM18.2 14V6H20.8L22.6 10.8L24.4 6H27V14H25.1V9.1L23.4 13.5H21.8L20.1 9.1V14H18.2Z"
        fill="currentColor"
      />
    </svg>
  ),
  hipercard: () => (
    <svg viewBox="0 0 38 20" className="w-9 h-5" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="36" height="16" rx="3" fill="#B91C1C" fillOpacity="0.85" />
      <path
        d="M9 14V6H11.2V9.1H14.8V6H17V14H14.8V10.9H11.2V14H9ZM20 14V6H22.2V14H20ZM24.5 14V6H28C29.4 6 30.3 6.9 30.3 8.3C30.3 9.7 29.4 10.6 28 10.6H26.7V14H24.5ZM26.7 8.9H27.7C28.2 8.9 28.5 8.6 28.5 8.2C28.5 7.8 28.2 7.5 27.7 7.5H26.7V8.9Z"
        fill="#FFFFFF"
      />
    </svg>
  ),
  other: () => (
    <svg viewBox="0 0 32 20" className="w-7 h-4" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="29" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.85" />
      <path d="M1.5 7.5H30.5" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.85" />
      <rect x="5.5" y="11.5" width="7" height="2.5" rx="1" fill="currentColor" fillOpacity="0.85" />
    </svg>
  )
}

export const CardBrandLogo = ({ brand, className = '' }: CardBrandLogoProps) => {
  const renderBrand = BRAND_SVGS[brand] || BRAND_SVGS.other
  const label = BRAND_LABELS[brand] || BRAND_LABELS.other

  return (
    <span
      data-testid="credit-card-brand"
      aria-label={`Bandeira ${label}`}
      className={`inline-flex items-center justify-center px-2 py-1 rounded-md bg-black/35 border border-white/15 text-white ${className}`.trim()}
    >
      {renderBrand()}
      <span className="sr-only">{brand}</span>
    </span>
  )
}
