import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PluggyConnect } from 'pluggy-connect-sdk'
import {
  Landmark,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Building2,
  ExternalLink,
  Info
} from 'lucide-react'
import { useOpenFinance } from '../../hooks/useOpenFinance'
import {
  OPEN_FINANCE_SANDBOX_INSTITUTIONS,
  type ConnectTokenResponse,
  type OpenFinanceInstitutionOption,
  type OpenFinanceSyncSummary
} from '../../types/openFinance'

export interface OpenFinanceModalProps {
  isOpen: boolean
  onClose: () => void
  profileId?: string | null
  onConnected?: (summary: OpenFinanceSyncSummary) => void
}

type ModalStep = 'consent' | 'connect' | 'summary'

export const OpenFinanceModal: React.FC<OpenFinanceModalProps> = ({
  isOpen,
  onClose,
  profileId = null,
  onConnected
}) => {
  const {
    createConnectToken,
    isCreatingToken,
    createConnection,
    isCreatingConnection
  } = useOpenFinance(profileId)

  const [step, setStep] = useState<ModalStep>('consent')
  const [tokenData, setTokenData] = useState<ConnectTokenResponse | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<OpenFinanceInstitutionOption>(
    OPEN_FINANCE_SANDBOX_INSTITUTIONS[0]
  )
  const [syncSummary, setSyncSummary] = useState<OpenFinanceSyncSummary | null>(null)
  const [connectedInstitutionName, setConnectedInstitutionName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLaunchingWidget, setIsLaunchingWidget] = useState<boolean>(false)
  const pluggyInstanceRef = useRef<PluggyConnect | null>(null)

  const isLiveMode = tokenData?.mode === 'production' || tokenData?.mode === 'live'

  const handleClose = () => {
    void pluggyInstanceRef.current?.destroy?.()
    pluggyInstanceRef.current = null
    setStep('consent')
    setTokenData(null)
    setSyncSummary(null)
    setErrorMessage(null)
    setIsLaunchingWidget(false)
    onClose()
  }

  const launchPluggyWidget = useCallback(async (connectToken: string) => {
    setErrorMessage(null)
    setIsLaunchingWidget(true)
    try {
      const pluggy = new PluggyConnect({
        connectToken,
        language: 'pt',
        onSuccess: async ({ item }) => {
          setErrorMessage(null)
          try {
            const institutionId = String(item.connector?.id ?? 'pluggy')
            const institutionName = item.connector?.name ?? 'Instituição Bancária'
            const institutionLogoUrl = item.connector?.imageUrl ?? null
            const result = await createConnection({
              provider: 'pluggy',
              externalItemId: item.id,
              institutionId,
              institutionName,
              institutionLogoUrl,
              profileId
            })
            setConnectedInstitutionName(result.connection.institutionName || institutionName)
            setSyncSummary(result.syncSummary)
            setStep('summary')
            if (onConnected) {
              onConnected(result.syncSummary)
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro ao registrar conexão Pluggy.'
            setErrorMessage(msg)
          }
        },
        onError: (error) => {
          setErrorMessage(error?.message || 'Erro ao conectar instituição no Pluggy Connect.')
        },
        onClose: () => {
          setIsLaunchingWidget(false)
        }
      })
      pluggyInstanceRef.current = pluggy
      await pluggy.init()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Não foi possível abrir o Pluggy Connect.'
      setErrorMessage(msg)
    } finally {
      setIsLaunchingWidget(false)
    }
  }, [createConnection, onConnected, profileId])

  useEffect(() => {
    if (!isOpen || step !== 'connect' || !isLiveMode || !tokenData?.connectToken) {
      return
    }
    void launchPluggyWidget(tokenData.connectToken)
    return () => {
      void pluggyInstanceRef.current?.destroy?.()
      pluggyInstanceRef.current = null
    }
  }, [isOpen, step, isLiveMode, tokenData?.connectToken, launchPluggyWidget])

  if (!isOpen) return null

  const handleProceedToConnect = async () => {
    setErrorMessage(null)
    try {
      const response = await createConnectToken({
        provider: 'pluggy',
        profileId
      })
      setTokenData(response)
      setStep('connect')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao iniciar sessão Open Finance.'
      setErrorMessage(msg)
    }
  }

  const handleConfirmConnection = async () => {
    setErrorMessage(null)
    try {
      const externalItemId = `sandbox-pluggy-${selectedInstitution.id}-${Date.now()}`
      const result = await createConnection({
        provider: 'pluggy',
        externalItemId,
        institutionId: selectedInstitution.id,
        institutionName: selectedInstitution.name,
        profileId
      })
      setConnectedInstitutionName(result.connection.institutionName || selectedInstitution.name)
      setSyncSummary(result.syncSummary)
      setStep('summary')
      if (onConnected) {
        onConnected(result.syncSummary)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao conectar instituição.'
      setErrorMessage(msg)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-finance-modal-title"
      data-testid="open-finance-modal"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="open-finance-modal-title"
                className="text-sm sm:text-base font-semibold text-foreground leading-snug"
              >
                Conexão Open Finance Brasil
              </h2>
              <p className="text-xs text-muted-foreground leading-snug">
                {step === 'consent' && 'Etapa 1 de 3 · Autorização somente leitura'}
                {step === 'connect' && 'Etapa 2 de 3 · Seleção de instituição'}
                {step === 'summary' && 'Etapa 3 de 3 · Sincronização concluída'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="open-finance-modal-close"
            onClick={handleClose}
            aria-label="Fechar modal de conexão bancária"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              data-testid="open-finance-modal-error"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'consent' && (
            <div className="space-y-4" data-testid="open-finance-consent-step">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Acesso estritamente Somente Leitura</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O Dinheirizz consulta apenas saldos, extratos e faturas de cartão via agregador
                  regulado pelo Banco Central. Este consentimento é somente leitura e sem permissão
                  de Pix, transferências ou movimentações financeiras.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Você pode revogar o acesso imediatamente a qualquer momento.</span>
                </div>
              </div>

              <div
                data-testid="open-finance-meu-pluggy-guide"
                className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Conexão oficial via Pluggy
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                    Meu Pluggy + Connect
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ao continuar, você conectará sua instituição pelo widget oficial do Pluggy
                  Connect. Caso ainda não tenha cadastro ou queira gerenciar consentimentos,
                  acesse o portal Meu Pluggy.
                </p>
                <a
                  href="https://meu.pluggy.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="open-finance-meu-pluggy-link"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-primary transition-colors"
                >
                  <span>Acessar Meu Pluggy</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <div
                data-testid="open-finance-pluggy-disclaimer"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground"
              >
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  A sincronização está sujeita às regras, janelas de atualização do Open Finance
                  Brasil e limites vigentes do Pluggy — atualmente{' '}
                  <strong className="font-semibold text-foreground">
                    até 5 conexões (instituições/contas) por CPF
                  </strong>{' '}
                  no plano pessoal gratuito.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  data-testid="open-finance-consent-cancel-btn"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="open-finance-consent-continue-btn"
                  onClick={handleProceedToConnect}
                  disabled={isCreatingToken}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingToken ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Preparando sessão...</span>
                    </>
                  ) : (
                    <>
                      <span>Concordar e continuar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'connect' && (
            <div className="space-y-4" data-testid="open-finance-connect-step">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {isLiveMode
                      ? 'Autorize sua instituição no Pluggy Connect'
                      : 'Selecione a instituição para conectar'}
                  </span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                  {isLiveMode ? 'Produção' : 'Sandbox'}
                </span>
              </div>

              {isLiveMode ? (
                <div
                  data-testid="open-finance-pluggy-widget-container"
                  className="p-4 rounded-xl bg-muted/30 border border-border space-y-3 text-center"
                >
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isCreatingConnection
                      ? 'Salvando conexão e importando contas e transações...'
                      : 'Conclua o consentimento na janela oficial do Pluggy Connect. Se ela não abrir automaticamente, clique no botão abaixo.'}
                  </p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      data-testid="open-finance-pluggy-launch-btn"
                      onClick={() => {
                        if (tokenData?.connectToken) {
                          void launchPluggyWidget(tokenData.connectToken)
                        }
                      }}
                      disabled={isLaunchingWidget || isCreatingConnection}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isLaunchingWidget || isCreatingConnection ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {isCreatingConnection
                          ? 'Sincronizando...'
                          : isLaunchingWidget
                            ? 'Abrindo Pluggy Connect...'
                            : 'Abrir Pluggy Connect'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {OPEN_FINANCE_SANDBOX_INSTITUTIONS.map((inst) => {
                    const isSelected = selectedInstitution.id === inst.id
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        data-testid={`open-finance-institution-${inst.id}`}
                        onClick={() => setSelectedInstitution(inst)}
                        aria-pressed={isSelected}
                        className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 border-primary text-foreground ring-1 ring-primary/30'
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
                          {inst.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {inst.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {inst.typeLabel}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  data-testid="open-finance-back-btn"
                  onClick={() => setStep('consent')}
                  disabled={isCreatingConnection}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
                {!isLiveMode && (
                  <button
                    type="button"
                    data-testid="open-finance-connect-submit-btn"
                    onClick={handleConfirmConnection}
                    disabled={isCreatingConnection}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingConnection ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <span>Conectar {selectedInstitution.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'summary' && syncSummary && (
            <div className="space-y-4" data-testid="open-finance-summary-step">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {connectedInstitutionName} conectado com sucesso
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Consentimento somente leitura ativo e conciliação anti-duplicidade aplicada.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[11px] text-muted-foreground">Contas vinculadas</div>
                  <div className="text-lg font-bold text-foreground font-tabular mt-0.5">
                    {syncSummary.accountsLinked}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[11px] text-muted-foreground">Transações importadas</div>
                  <div className="text-lg font-bold text-foreground font-tabular mt-0.5">
                    {syncSummary.transactionsImported}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[11px] text-muted-foreground">Duplicatas evitadas</div>
                  <div className="text-lg font-bold text-foreground font-tabular mt-0.5">
                    {syncSummary.duplicatesSkipped}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[11px] text-muted-foreground">Lançamentos conciliados</div>
                  <div className="text-lg font-bold text-foreground font-tabular mt-0.5">
                    {syncSummary.reconciledCount}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  data-testid="open-finance-finish-btn"
                  onClick={handleClose}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
