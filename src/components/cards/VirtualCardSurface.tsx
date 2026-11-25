import { useId } from 'react'
import { detectBank } from '../../lib/banks'
import { BankLogo } from '../banks/BankLogo'
import { CardBrandLogo } from '../banks/CardBrandLogo'
import type { CreditCardBrand } from '../../schemas/creditCards'

export interface VirtualCardSurfaceProps {
  name: string
  brand: CreditCardBrand
  lastFourDigits?: string | null
  closingDay: number
  dueDay: number
  color?: string | null
  fallbackBankHint?: string | null
  compact?: boolean
}

const CardChip = () => {
  const gradientId = useId()

  return (
    <svg
      className="w-9 h-6 sm:w-10 sm:h-7 rounded-sm shadow-sm flex-shrink-0"
      viewBox="0 0 40 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="40" height="28" rx="4" fill={`url(#${gradientId})`} />
      <path
        d="M0 14h12m16 0h12M12 4v20m16-20v20M12 9h16M12 19h16"
        stroke="#78350f"
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />
      <rect x="15" y="8" width="10" height="12" rx="2" fill="#d97706" fillOpacity="0.3" />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#d97706" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export const VirtualCardSurface = ({
  name,
  brand,
  lastFourDigits,
  closingDay,
  dueDay,
  color,
  fallbackBankHint,
  compact = false
}: VirtualCardSurfaceProps) => {
  const detectedFromName = detectBank(name)
  const bankInfo =
    detectedFromName.slug !== 'generic'
      ? detectedFromName
      : fallbackBankHint
        ? detectBank(fallbackBankHint)
        : detectedFromName

  const isKnownBank = bankInfo.slug !== 'generic'
  const background = isKnownBank
    ? bankInfo.cardSkin.gradient
    : color
      ? `linear-gradient(135deg, ${color} 0%, #0d0e12 100%)`
      : bankInfo.cardSkin.gradient

  const logoName = isKnownBank ? bankInfo.name : name.trim() || 'Cartão'
  const safeClosingDay = Number.isFinite(closingDay) && closingDay > 0 ? closingDay : 25
  const safeDueDay = Number.isFinite(dueDay) && dueDay > 0 ? dueDay : 5

  return (
    <div
      data-bank-slug={bankInfo.slug}
      className={`relative overflow-hidden rounded-2xl shadow-lg flex flex-col justify-between gap-3 min-h-[184px] aspect-[1.586/1] border transition-all ${
        compact ? 'p-4' : 'p-4 sm:p-5'
      }`}
      style={{
        background,
        color: bankInfo.cardSkin.textColor,
        borderColor: bankInfo.cardSkin.borderColor
      }}
    >
      {/* Overlay sutil para garantir contraste >= 4.5:1 e acabamento fosco Apple Wallet */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isKnownBank ? 'bg-black/15' : 'bg-black/35'
        }`}
      />

      {/* Faixa de acento sutil do banco */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80 pointer-events-none"
        style={{ backgroundColor: bankInfo.cardSkin.accentColor }}
      />

      {/* Topo do cartão: Chip, Logo do Banco & Bandeira */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <CardChip />
          <BankLogo
            slug={bankInfo.slug}
            name={logoName}
            initials={bankInfo.initials}
            size="sm"
            variant="card"
          />
        </div>
        <CardBrandLogo brand={brand} />
      </div>

      {/* Número mascarado & Nome */}
      <div className="relative z-10 space-y-1 my-auto">
        <div
          data-testid="credit-card-digits"
          className="text-sm sm:text-lg font-mono tracking-wider font-semibold whitespace-nowrap"
        >
          •••• •••• •••• {lastFourDigits || '••••'}
        </div>
        <div
          data-testid="credit-card-name"
          className="text-xs sm:text-sm font-medium truncate"
          style={{ color: bankInfo.cardSkin.textColor }}
        >
          {name.trim() || 'Nome do Cartão'}
        </div>
      </div>

      {/* Rodapé do Cartão Virtual: Datas de Ciclo */}
      <div
        className="relative z-10 flex items-center justify-between text-[11px] border-t border-white/15 pt-2 font-mono"
        style={{ color: bankInfo.cardSkin.textColor }}
      >
        <div>
          <span
            className="block text-[9px] uppercase tracking-wider"
            style={{ color: bankInfo.cardSkin.mutedTextColor }}
          >
            Fecha
          </span>
          <span>Dia {String(safeClosingDay).padStart(2, '0')}</span>
        </div>
        <div className="text-right">
          <span
            className="block text-[9px] uppercase tracking-wider"
            style={{ color: bankInfo.cardSkin.mutedTextColor }}
          >
            Vence
          </span>
          <span>Dia {String(safeDueDay).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  )
}
