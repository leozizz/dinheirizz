import type { ReactElement } from 'react'

export type BankLogoSize = 'sm' | 'md' | 'lg'
export type BankLogoVariant = 'badge' | 'monochrome' | 'card'

export interface BankLogoProps {
  slug: string
  name: string
  initials?: string
  primaryColor?: string
  size?: BankLogoSize
  variant?: BankLogoVariant
  className?: string
}

const SIZE_MAP: Record<BankLogoSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11'
}

const ICON_SIZE_MAP: Record<BankLogoSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

const BANK_SVG_MARKS: Record<string, (iconClass: string) => ReactElement> = {
  nubank: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M4.5 18V8.5C4.5 6.84 5.84 5.5 7.5 5.5C9.16 5.5 10.5 6.84 10.5 8.5V18M13.5 6V15.5C13.5 17.16 14.84 18.5 16.5 18.5C18.16 18.5 19.5 17.16 19.5 15.5V6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  itau: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 16.5V9.5M8.5 7V7.2M13.5 7.5V15C13.5 16 14.2 16.5 15.2 16.5H16M12 10.5H15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  bradesco: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M5 18C6.5 11.5 10.5 7 16.5 5.5C18.5 5 19.5 6.5 18.5 8.5C17 11.5 14 14.5 9.5 17.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11 18C12 14.5 14.5 11.5 19 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  santander: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M12 4C11.5 6.8 14.2 8.2 14.2 10.8C14.2 12.2 13.1 13.3 12 14C10.9 13.3 9.8 12.2 9.8 10.8C9.8 8.2 12.5 6.8 12 4Z"
        fill="currentColor"
      />
      <path
        d="M6.5 13.5C5.2 14.6 5 16.5 6.2 17.8C7.8 19.5 10.2 20 12 20C13.8 20 16.2 19.5 17.8 17.8C19 16.5 18.8 14.6 17.5 13.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  ),
  bb: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M12 3.5L20.5 12L12 20.5L3.5 12L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12L12 8.5L15.5 12L12 15.5L8.5 12Z"
        fill="currentColor"
      />
    </svg>
  ),
  caixa: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  inter: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M7 17V10.5M7 7V7.3M11.5 17V12.5C11.5 10.8 12.8 9.5 14.5 9.5C16.2 9.5 17.5 10.8 17.5 12.5V17"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  ),
  c6: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M10.5 7.5C8 7.5 6 9.5 6 12C6 14.5 8 16.5 10.5 16.5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="14" r="2.6" stroke="currentColor" strokeWidth="2.1" />
      <path d="M13.5 13.5C13.8 10 15.5 8 18 7.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  ),
  agibank: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M6.5 17.5L12 5.5L17.5 17.5M8.8 13.5H15.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  btg: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M6 6H12.5C14.4 6 15.8 7.1 15.8 8.8C15.8 10.2 14.8 11.2 13.4 11.6C15.2 12 16.5 13.2 16.5 15C16.5 16.8 15 18 12.8 18H6V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 11.8H13" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  xp: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M5 7L10.5 17M10.5 7L5 17M14 17V7H17.2C18.8 7 19.8 8 19.8 9.6C19.8 11.2 18.8 12.2 17.2 12.2H14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  neon: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path
        d="M6.5 17.5V6.5L17.5 17.5V6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  picpay: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="2.1" />
      <path d="M5 13.5V19M15 9.5H17.5C18.6 9.5 19.5 10.4 19.5 11.5V16.5C19.5 17.6 18.6 18.5 17.5 18.5H12.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  ),
  mercadopago: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <ellipse cx="12" cy="12" rx="8.5" ry="6" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 12.2C9.8 10.7 11.2 10.7 12 12C12.8 13.3 14.2 13.3 15.5 11.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  pagbank: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 16V8.5H13.2C14.7 8.5 15.6 9.4 15.6 10.8C15.6 12.2 14.7 13.1 13.2 13.1H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sicredi: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path d="M12 4L14.3 9.2L20 9.6L15.6 13.3L17 18.8L12 15.8L7 18.8L8.4 13.3L4 9.6L9.7 9.2L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  sicoob: (iconClass) => (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass} aria-hidden="true">
      <path d="M12 4.5L19 8.5V15.5L12 19.5L5 15.5V8.5L12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8.5L15.5 12L12 15.5L8.5 12L12 8.5Z" fill="currentColor" />
    </svg>
  )
}

const parseHexLuminance = (hexColor: string): number | null => {
  const clean = hexColor.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return null
  }

  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const toLinear = (channel: number): number =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

const getBadgeContrastStyle = (primaryColor?: string) => {
  if (!primaryColor) {
    return undefined
  }

  const luminance = parseHexLuminance(primaryColor)
  if (luminance === null) {
    return {
      backgroundColor: primaryColor,
      color: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.22)'
    }
  }

  // Contraste WCAG AA (>= 4.5:1) escolhendo entre texto claro (#ffffff) e escuro (#0f172a)
  const contrastWithWhite = 1.05 / (luminance + 0.05)
  const darkLuminance = 0.008 // ~#0f172a
  const contrastWithDark = (luminance + 0.05) / (darkLuminance + 0.05)
  const useDarkText = contrastWithDark > contrastWithWhite

  return {
    backgroundColor: primaryColor,
    color: useDarkText ? '#0f172a' : '#ffffff',
    borderColor: luminance < 0.15 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(15, 23, 42, 0.16)'
  }
}

export const BankLogo = ({
  slug,
  name,
  initials = 'B',
  primaryColor,
  size = 'sm',
  variant = 'badge',
  className = ''
}: BankLogoProps) => {
  const renderMark = BANK_SVG_MARKS[slug]
  const containerSize = SIZE_MAP[size]
  const iconSize = ICON_SIZE_MAP[size]

  const isCardVariant = variant === 'card'
  const isMonochrome = variant === 'monochrome'

  const badgeStyle = !isCardVariant && !isMonochrome ? getBadgeContrastStyle(primaryColor) : undefined

  return (
    <div
      data-testid={`bank-logo-${slug}`}
      aria-label={`Logo ${name}`}
      role="img"
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-xl border transition-colors ${containerSize} ${
        isCardVariant
          ? 'bg-white/15 border-white/25 text-white backdrop-blur-sm'
          : isMonochrome
            ? 'bg-muted/60 border-border text-foreground'
            : 'border-border'
      } ${className}`.trim()}
      style={badgeStyle}
    >
      {renderMark ? (
        renderMark(iconSize)
      ) : (
        <span className="text-[10px] font-bold tracking-tight leading-none select-none">
          {initials.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}
