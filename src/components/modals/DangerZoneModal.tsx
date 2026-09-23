import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, AlertTriangle, Receipt, QrCode, WalletCards, RefreshCw, CheckCircle2 } from 'lucide-react'
import { DangerConfirmModal } from './DangerConfirmModal'
import {
  useDeleteTransactions,
  useDeletePixKeys,
  useDeleteAccounts,
  useResetAllData
} from '../../hooks/useDataManagement'

export interface DangerZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccessNotification?: (message: string) => void
  onDeleteTransactions?: () => Promise<void> | void
  onDeletePixKeys?: () => Promise<void> | void
  onDeleteAccounts?: () => Promise<void> | void
  onResetAllData?: () => Promise<void> | void
}

type DangerActionType = 'transactions' | 'pix-keys' | 'accounts' | 'reset-all'

export function DangerZoneModal({
  isOpen,
  onClose,
  onSuccessNotification,
  onDeleteTransactions,
  onDeletePixKeys,
  onDeleteAccounts,
  onResetAllData
}: DangerZoneModalProps) {
  const [activeAction, setActiveAction] = useState<DangerActionType | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const deleteTransactionsMutation = useDeleteTransactions()
  const deletePixKeysMutation = useDeletePixKeys()
  const deleteAccountsMutation = useDeleteAccounts()
  const resetAllDataMutation = useResetAllData()

  if (!isOpen) return null

  const handleActionSuccess = (msg: string) => {
    setActiveAction(null)
    setFeedbackMessage(msg)
    if (onSuccessNotification) {
      onSuccessNotification(msg)
    }
    setTimeout(() => {
      setFeedbackMessage(null)
    }, 4000)
  }

  const renderActiveConfirmModal = () => {
    switch (activeAction) {
      case 'transactions':
        return (
          <DangerConfirmModal
            isOpen={true}
            onClose={() => setActiveAction(null)}
            title="Excluir Todas as Transações"
            description="Todas as suas receitas, despesas e lançamentos financeiros serão permanentemente removidos. Suas contas bancárias continuarão existindo e terão o saldo zerado."
            expectedPhrase="apagar todas as minhas transações"
            confirmButtonText="Confirmar Exclusão das Transações"
            onConfirm={async () => {
              if (onDeleteTransactions) {
                await onDeleteTransactions()
              } else {
                await deleteTransactionsMutation.mutateAsync()
              }
              handleActionSuccess('Histórico de transações excluído com sucesso.')
            }}
          />
        )

      case 'pix-keys':
        return (
          <DangerConfirmModal
            isOpen={true}
            onClose={() => setActiveAction(null)}
            title="Excluir Todas as Chaves Pix"
            description="Todas as chaves Pix cadastradas na sua carteira de recebimento serão excluídas de forma permanente."
            expectedPhrase="apagar todas as minhas chaves pix"
            confirmButtonText="Confirmar Exclusão das Chaves Pix"
            onConfirm={async () => {
              if (onDeletePixKeys) {
                await onDeletePixKeys()
              } else {
                await deletePixKeysMutation.mutateAsync()
              }
              handleActionSuccess('Chaves Pix removidas com sucesso.')
            }}
          />
        )

      case 'accounts':
        return (
          <DangerConfirmModal
            isOpen={true}
            onClose={() => setActiveAction(null)}
            title="Excluir Contas Financeiras"
            description="Todas as contas cadastradas serão excluídas. Uma nova Conta Principal limpa será recriada automaticamente para manter seu aplicativo funcional."
            cascadeWarning="Efeito em cascata: todas as transações, extratos e movimentações vinculadas a essas contas serão permanentemente apagados."
            expectedPhrase="apagar todas as contas"
            confirmButtonText="Confirmar Exclusão das Contas"
            onConfirm={async () => {
              if (onDeleteAccounts) {
                await onDeleteAccounts()
              } else {
                await deleteAccountsMutation.mutateAsync()
              }
              handleActionSuccess('Contas e transações vinculadas foram excluídas.')
            }}
          />
        )

      case 'reset-all':
        return (
          <DangerConfirmModal
            isOpen={true}
            onClose={() => setActiveAction(null)}
            title="Reset Geral da Conta"
            description="Limpeza completa: todas as contas, extrato financeiro, categorias personalizadas e chaves Pix serão excluídos atomicamente. Sua conta de usuário e acesso continuam válidos."
            cascadeWarning="Atenção máxima: esta ação é 100% irreversível e restaura os dados operacionais ao estado inicial de fábrica."
            expectedPhrase="resetar todos os meus dados"
            confirmButtonText="Confirmar Reset Geral"
            onConfirm={async () => {
              if (onResetAllData) {
                await onResetAllData()
              } else {
                await resetAllDataMutation.mutateAsync()
              }
              handleActionSuccess('Reset geral concluído com sucesso. Todos os dados foram limpos.')
            }}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <AnimatePresence>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-zone-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-neutral-900/95 border border-rose-500/25 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-rose-950/30 text-white my-auto pb-8 sm:pb-9"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 id="danger-zone-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                    Zona de Perigo (Gerenciamento de Dados)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ações de exclusão irreversível com proteção de dupla confirmação.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* List of Danger Actions */}
            <div className="space-y-3.5">
              {/* Card 1: Transações */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 sm:mt-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Excluir Histórico de Transações</h4>
                    <p className="text-[11px] sm:text-xs text-neutral-400 leading-snug mt-0.5">
                      Apaga todas as despesas e receitas. Mantém as contas e zera seus saldos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('transactions')}
                  className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  Apagar Transações
                </button>
              </div>

              {/* Card 2: Chaves Pix */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 sm:mt-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Excluir Chaves Pix</h4>
                    <p className="text-[11px] sm:text-xs text-neutral-400 leading-snug mt-0.5">
                      Remove todas as chaves Pix cadastradas na sua carteira de recebimentos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('pix-keys')}
                  className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  Apagar Chaves Pix
                </button>
              </div>

              {/* Card 3: Contas */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                    <WalletCards className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-white">Excluir Contas Financeiras</h4>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30 font-medium">
                        Cascata
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-400 leading-snug mt-0.5">
                      Remove todas as contas e, em cascata, todo o histórico de extrato associado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('accounts')}
                  className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  Apagar Contas
                </button>
              </div>

              {/* Card 4: Reset Geral */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0 mt-0.5 sm:mt-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-rose-200">Reset Geral de Dados</h4>
                    <p className="text-[11px] sm:text-xs text-neutral-400 leading-snug mt-0.5">
                      Limpa todas as contas, transações e chaves Pix. Restaura a conta ao estado original de fábrica.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('reset-all')}
                  className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-rose-950/60 shrink-0"
                >
                  Resetar Tudo
                </button>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-neutral-400 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Nenhuma exclusão pode ser desfeita após a confirmação.</span>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Confirmation Dialog */}
      {renderActiveConfirmModal()}
    </>
  )
}
