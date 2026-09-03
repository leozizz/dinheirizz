import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, QrCode } from 'lucide-react'

export type ActionType = 'income' | 'expense' | 'transfer' | 'pix'

interface QuickActionsProps {
  onAction: (action: ActionType) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'income' as ActionType,
      label: 'Receber',
      sublabel: 'Receita',
      icon: ArrowDownLeft,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-teal-500/10',
      borderColor: 'hover:border-emerald-500/30'
    },
    {
      id: 'expense' as ActionType,
      label: 'Despesa',
      sublabel: 'Gastar',
      icon: ArrowUpRight,
      color: 'text-rose-400',
      bgGlow: 'from-rose-500/10 to-red-500/10',
      borderColor: 'hover:border-rose-500/30'
    },
    {
      id: 'transfer' as ActionType,
      label: 'Transferir',
      sublabel: 'Entre contas',
      icon: ArrowLeftRight,
      color: 'text-blue-400',
      bgGlow: 'from-blue-500/10 to-indigo-500/10',
      borderColor: 'hover:border-blue-500/30'
    },
    {
      id: 'pix' as ActionType,
      label: 'Pix',
      sublabel: 'Carteira digital',
      icon: QrCode,
      color: 'text-teal-300',
      bgGlow: 'from-teal-500/10 to-cyan-500/10',
      borderColor: 'hover:border-teal-500/30'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            className={`glass-card-interactive p-4 rounded-2xl flex flex-col items-center text-center group cursor-pointer transition-all duration-200 border border-white/10 bg-gradient-to-b ${action.bgGlow} ${action.borderColor}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 mb-2.5 shadow-sm group-hover:scale-105 transition-transform ${action.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white group-hover:text-white">
              {action.label}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5">
              {action.sublabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
