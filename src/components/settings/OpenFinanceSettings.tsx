import React, { useState } from 'react'
import {
  Landmark,
  ShieldCheck,
  RefreshCw,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { useOpenFinance } from '../../hooks/useOpenFinance'
import { formatBRL } from '../../lib/formatters'
import { OpenFinanceModal } from '../modals/OpenFinanceModal'
import type { OpenFinanceStatus } from '../../types/openFinance'

export interface OpenFinanceSettingsProps {
  profileId?: string | null
}

const STATUS_CONFIG: Record<
  OpenFinanceStatus,
  { label: string; badgeClass: string }
> = {
  active: {
    label: 'Ativo',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  },
  updating: {
    label: 'Atualizando',
    badgeClass: 'bg-primary/15 text-primary border-primary/30'
  },
  login_error: {
    label: 'Erro de login',
    badgeClass:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  outdated: {
    label: 'Desatualizado',
    badgeClass:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  revoked: {
    label: 'Revogado',
    badgeClass: 'bg-muted text-muted-foreground border-border'
  }
}

const formatLastSync = (isoDate: string | null): string => {
  if (!isoDate) return 'Nunca sincronizado'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}

export const OpenFinanceSettings: React.FC<OpenFinanceSettingsProps> = ({
  profileId = null
}) => {
  const {
    connections,
    isLoading,
    syncConnection,
    isSyncing,
    revokeConnection,
    isRevoking
  } = useOpenFinance(profileId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleSync = async (connectionId: string) => {
    setFeedback(null)
    setSyncingId(connectionId)
    try {
      const res = await syncConnection(connectionId)
      setFeedback({
        type: 'success',
        message: `Sincronização concluída: ${res.syncSummary.transactionsImported} transações importadas.`
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao sincronizar conta.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setSyncingId(null)
    }
  }

  const handleConfirmRevoke = async (connectionId: string) => {
    setFeedback(null)
    try {
      await revokeConnection(connectionId)
      setConfirmRevokeId(null)
      setFeedback({
        type: 'success',
        message: 'Consentimento bancário revogado com sucesso.'
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao revogar consentimento.'
      setFeedback({ type: 'error', message: msg })
    }
  }

  return (
    <div
      className="mt-6 pt-5 border-t border-border space-y-3"
      data-testid="open-finance-settings-section"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-xs font-semibold text-foreground">
                Conexões Bancárias (Open Finance)
              </h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/25">
                <ShieldCheck className="w-3 h-3" />
                Somente Leitura
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sincronize saldos e extratos automaticamente sem permissão de movimentação.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="open-finance-connect-btn"
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Conectar banco</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          data-testid="open-finance-settings-feedback"
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Carregando conexões Open Finance...</span>
        </div>
      ) : connections.length === 0 ? (
        <div
          data-testid="open-finance-empty-state"
          className="p-4 rounded-xl bg-muted/30 border border-border text-center space-y-1.5"
        >
          <p className="text-xs font-medium text-foreground">
            Nenhum banco conectado ainda
          </p>
          <p className="text-[11px] text-muted-foreground">
            Conecte sua conta via Open Finance Brasil para atualizar saldos e transações.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {connections.map((conn) => {
            const statusCfg = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.active
            const isConfirming = confirmRevokeId === conn.id
            const isCurrentSyncing = isSyncing && syncingId === conn.id

            return (
              <div
                key={conn.id}
                data-testid={`open-finance-connection-card-${conn.id}`}
                className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {conn.institutionName}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {conn.provider}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Última sincronização: {formatLastSync(conn.lastSyncAt)}
                    </p>
                    {conn.lastError && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        {conn.lastError}
                      </p>
                    )}
                  </div>

                  {conn.status !== 'revoked' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`open-finance-sync-btn-${conn.id}`}
                        onClick={() => handleSync(conn.id)}
                        disabled={isCurrentSyncing || isRevoking}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isCurrentSyncing ? 'animate-spin' : ''}`}
                        />
                        <span>Sincronizar</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`open-finance-revoke-btn-${conn.id}`}
                        onClick={() => setConfirmRevokeId(conn.id)}
                        disabled={isRevoking}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Revogar acesso</span>
                      </button>
                    </div>
                  )}
                </div>

                {conn.linkedAccounts.length > 0 && (
                  <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {conn.linkedAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border text-[11px]"
                      >
                        <span className="text-muted-foreground truncate">
                          {acc.externalAccountName}
                        </span>
                        {acc.lastBalance !== null && acc.lastBalance !== undefined && (
                          <span className="font-semibold text-foreground font-tabular shrink-0">
                            {formatBRL(acc.lastBalance)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isConfirming && (
                  <div
                    data-testid={`open-finance-revoke-confirm-box-${conn.id}`}
                    className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <span className="text-xs text-foreground">
                      Confirmar revogação do acesso somente leitura para {conn.institutionName}?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`open-finance-cancel-revoke-btn-${conn.id}`}
                        onClick={() => setConfirmRevokeId(null)}
                        disabled={isRevoking}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        data-testid={`open-finance-confirm-revoke-btn-${conn.id}`}
                        onClick={() => handleConfirmRevoke(conn.id)}
                        disabled={isRevoking}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isRevoking ? 'Revogando...' : 'Confirmar revogação'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <OpenFinanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profileId={profileId}
      />
    </div>
  )
}
