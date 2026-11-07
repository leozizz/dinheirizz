import React, { useState, useEffect } from 'react'
import { X, PieChart, Trash2, Check, Plus, AlertCircle } from 'lucide-react'
import type { BudgetProgressItem } from '../../hooks/useBudgets'

export interface BudgetModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Array<{
    id: string
    name: string
    type: string
    color?: string | null
    icon?: string | null
  }>
  budgets: BudgetProgressItem[]
  onSaveBudget: (input: { categoryId: string; amountLimit: number }) => Promise<void> | void
  onDeleteBudget: (budgetId: string) => Promise<void> | void
  isLoading?: boolean
}

const parseCurrencyStringToNumber = (str: string): number => {
  if (!str) return 0
  const cleaned = str.replace(/[^\d]/g, '')
  if (!cleaned) return 0
  return parseFloat(cleaned) / 100
}

const formatNumberToCurrencyInput = (val: number): string => {
  if (val === 0) return '0,00'
  return (val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const maskCurrencyInput = (rawInput: string): string => {
  const digits = rawInput.replace(/\D/g, '')
  if (!digits) return '0,00'
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  budgets,
  onSaveBudget,
  onDeleteBudget,
  isLoading = false
}) => {
  // Estado local com os valores dos inputs por categoria
  const [valuesMap, setValuesMap] = useState<Record<string, string>>({})
  const [savingCategory, setSavingCategory] = useState<string | null>(null)
  const [successCategory, setSuccessCategory] = useState<string | null>(null)

  // Sincronizar os valores iniciais com os budgets existentes
  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, string> = {}
      for (const b of budgets) {
        initialMap[b.categoryId] = formatNumberToCurrencyInput(b.amountLimit)
      }
      setValuesMap(initialMap)
    }
  }, [isOpen, budgets])

  // Listener para fechar no Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Filtrar apenas categorias de despesa
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const handleInputChange = (categoryId: string, rawValue: string) => {
    const masked = maskCurrencyInput(rawValue)
    setValuesMap((prev) => ({ ...prev, [categoryId]: masked }))
  }

  const handleSave = async (categoryId: string) => {
    const rawVal = valuesMap[categoryId] || '0,00'
    const numericVal = parseCurrencyStringToNumber(rawVal)
    if (numericVal <= 0) return

    setSavingCategory(categoryId)
    try {
      await onSaveBudget({
        categoryId,
        amountLimit: numericVal
      })
      setSuccessCategory(categoryId)
      setTimeout(() => setSuccessCategory(null), 1500)
    } finally {
      setSavingCategory(null)
    }
  }

  const handleDelete = async (budgetId: string, categoryId: string) => {
    setSavingCategory(categoryId)
    try {
      await onDeleteBudget(budgetId)
      setValuesMap((prev) => {
        const next = { ...prev }
        delete next[categoryId]
        return next
      })
    } finally {
      setSavingCategory(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden glass-card-glow rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] flex flex-col bg-neutral-900/95">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 id="budget-modal-title" className="text-lg font-bold text-white font-display">
                Orçamentos Mensais
              </h2>
              <p className="text-xs text-neutral-400">
                Defina o teto de gastos para cada categoria
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-budget-modal"
            onClick={onClose}
            aria-label="Fechar modal"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Categorias de Despesa */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-neutral-500" />
              <p className="text-sm">Nenhuma categoria de despesa encontrada.</p>
            </div>
          ) : (
            expenseCategories.map((cat) => {
              const currentBudget = budgets.find((b) => b.categoryId === cat.id)
              const val = valuesMap[cat.id] ?? ''
              const isSaving = savingCategory === cat.id
              const isSuccess = successCategory === cat.id
              const catColor = cat.color || '#10b981'

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                >
                  {/* Identificação da Categoria */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: `${catColor}25`, borderColor: `${catColor}50`, borderWidth: 1 }}
                    >
                      <span style={{ color: catColor }}>●</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white block truncate">
                        {cat.name}
                      </span>
                      {currentBudget && (
                        <span className="text-[11px] text-neutral-400 block truncate">
                          Gasto atual: R$ {currentBudget.spentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campo de Entrada e Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-neutral-500 font-medium">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        data-testid={`input-budget-${cat.id}`}
                        aria-label={`Teto para ${cat.name}`}
                        placeholder="0,00"
                        value={val}
                        onChange={(e) => handleInputChange(cat.id, e.target.value)}
                        className="w-24 sm:w-28 pl-8 pr-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold tabular-nums focus:outline-none focus:border-primary/50 text-right"
                      />
                    </div>

                    {/* Botão Salvar */}
                    <button
                      type="button"
                      data-testid={`btn-save-budget-${cat.id}`}
                      aria-label={`Salvar ${cat.name}`}
                      disabled={isSaving || !val || val === '0,00'}
                      onClick={() => handleSave(cat.id)}
                      className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isSuccess
                          ? 'bg-emerald-500 text-white'
                          : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isSuccess ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>

                    {/* Botão Remover (se já cadastrado) */}
                    {currentBudget && (
                      <button
                        type="button"
                        data-testid={`btn-delete-budget-${cat.id}`}
                        aria-label={`Remover orçamento de ${cat.name}`}
                        disabled={isSaving}
                        onClick={() => handleDelete(currentBudget.id, cat.id)}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <span>Limites renovados mensalmente</span>
          <button
            type="button"
            data-testid="btn-finish-budget-modal"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
