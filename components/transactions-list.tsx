"use client"

import { GlassCard } from "./glass-card"
import { 
  ShoppingBag, 
  Car, 
  Coffee, 
  Zap, 
  Music, 
  Utensils,
  Smartphone,
  Plane,
  ChevronRight
} from "lucide-react"

interface Transaction {
  id: string
  title: string
  category: string
  amount: number
  date: string
  type: "income" | "expense"
  icon: React.ElementType
  iconBg: string
}

const transactions: Transaction[] = [
  {
    id: "1",
    title: "iFood",
    category: "Alimentação",
    amount: -48.90,
    date: "Hoje, 14:32",
    type: "expense",
    icon: Utensils,
    iconBg: "bg-orange-500/20 text-orange-400",
  },
  {
    id: "2",
    title: "Uber",
    category: "Transporte",
    amount: -23.50,
    date: "Hoje, 10:15",
    type: "expense",
    icon: Car,
    iconBg: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "3",
    title: "Salário",
    category: "Receita",
    amount: 8500.00,
    date: "Ontem",
    type: "income",
    icon: Zap,
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "4",
    title: "Spotify",
    category: "Assinaturas",
    amount: -21.90,
    date: "05 Mai",
    type: "expense",
    icon: Music,
    iconBg: "bg-green-500/20 text-green-400",
  },
  {
    id: "5",
    title: "Starbucks",
    category: "Alimentação",
    amount: -32.00,
    date: "05 Mai",
    type: "expense",
    icon: Coffee,
    iconBg: "bg-amber-500/20 text-amber-400",
  },
  {
    id: "6",
    title: "Apple Store",
    category: "Tecnologia",
    amount: -199.00,
    date: "04 Mai",
    type: "expense",
    icon: Smartphone,
    iconBg: "bg-slate-400/20 text-slate-300",
  },
  {
    id: "7",
    title: "Shopping",
    category: "Compras",
    amount: -356.80,
    date: "03 Mai",
    type: "expense",
    icon: ShoppingBag,
    iconBg: "bg-pink-500/20 text-pink-400",
  },
  {
    id: "8",
    title: "Passagem Aérea",
    category: "Viagem",
    amount: -1250.00,
    date: "02 Mai",
    type: "expense",
    icon: Plane,
    iconBg: "bg-sky-500/20 text-sky-400",
  },
]

function formatCurrency(value: number) {
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `-R$ ${formatted}` : `+R$ ${formatted}`
}

interface TransactionsListProps {
  layout?: "list" | "table"
  maxItems?: number
}

export function TransactionsList({ layout = "list", maxItems }: TransactionsListProps) {
  const displayedTransactions = maxItems ? transactions.slice(0, maxItems) : transactions
  const isTable = layout === "table"

  return (
    <GlassCard variant="subtle" className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 lg:px-6 py-4 lg:py-5 border-b border-white/5">
        <h3 className="text-sm lg:text-base font-medium text-foreground">
          Transações Recentes
        </h3>
        <button className="text-xs lg:text-sm text-primary hover:text-primary/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -m-2">
          Ver todas
        </button>
      </div>
      
      {/* Desktop Table Header */}
      {isTable && (
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
          <div className="col-span-5">Descrição</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-2 text-right">Valor</div>
          <div className="col-span-1" />
        </div>
      )}
      
      <div className="divide-y divide-white/5">
        {displayedTransactions.map((transaction) => (
          <button
            key={transaction.id}
            className={`
              w-full flex items-center hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors
              ${isTable 
                ? "lg:grid lg:grid-cols-12 gap-4 px-5 lg:px-6 py-3.5 lg:py-4 min-h-[64px] lg:min-h-[68px]" 
                : "gap-3.5 px-5 py-3.5 min-h-[72px]"
              }
            `}
          >
            {/* Icon */}
            <div className={`
              flex items-center shrink-0
              ${isTable ? "lg:col-span-5 gap-3.5" : ""}
            `}>
              <div className={`
                rounded-2xl flex items-center justify-center shrink-0 ${transaction.iconBg}
                ${isTable ? "w-10 h-10 lg:w-11 lg:h-11" : "w-11 h-11"}
              `}>
                <transaction.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              
              {/* Title - always visible next to icon in table layout */}
              {isTable && (
                <div className="hidden lg:block min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {transaction.title}
                  </p>
                </div>
              )}
            </div>
            
            {/* Mobile/Tablet: Details */}
            <div className={`
              flex-1 min-w-0 text-left
              ${isTable ? "lg:hidden" : ""}
            `}>
              <p className="text-sm font-medium text-foreground truncate">
                {transaction.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {transaction.category} • {transaction.date}
              </p>
            </div>
            
            {/* Desktop Table: Category */}
            {isTable && (
              <div className="hidden lg:flex col-span-2 items-center">
                <span className="text-sm text-muted-foreground truncate">
                  {transaction.category}
                </span>
              </div>
            )}
            
            {/* Desktop Table: Date */}
            {isTable && (
              <div className="hidden lg:flex col-span-2 items-center">
                <span className="text-sm text-muted-foreground">
                  {transaction.date}
                </span>
              </div>
            )}
            
            {/* Amount */}
            <div className={`
              flex items-center gap-2 shrink-0
              ${isTable ? "lg:col-span-2 lg:justify-end" : ""}
            `}>
              <span className={`text-sm font-semibold tabular-nums ${
                transaction.type === 'income' 
                  ? 'text-emerald-400' 
                  : 'text-foreground'
              }`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            
            {/* Chevron */}
            <div className={`
              flex items-center justify-end shrink-0
              ${isTable ? "lg:col-span-1" : ""}
            `}>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
