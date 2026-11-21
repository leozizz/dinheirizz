import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2
} from 'lucide-react'
import {
  useApiTokens,
  useCreateApiToken,
  useMcpAuditLogs,
  useRevokeApiToken
} from '../../hooks/useApiTokens'
import { getApiOrigin } from '../../lib/profileQuery'
import {
  MCP_SCOPES,
  MCP_SCOPE_LABELS,
  type ApiTokenScope,
  type CreateApiTokenResponse,
  type McpAuditLog,
  type PersonalApiToken
} from '../../types/apiTokens'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'

type ExpiryOption = 'none' | '30' | '90' | '365'

const formatDateTime = (isoDate: string | null): string => {
  if (!isoDate) return 'Nunca utilizado'
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

const getTokenStatus = (
  token: PersonalApiToken
): { label: string; badgeClass: string; isActive: boolean } => {
  if (token.revokedAt) {
    return {
      label: 'Revogado',
      badgeClass: 'bg-muted text-muted-foreground border-border',
      isActive: false
    }
  }

  if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) {
    return {
      label: 'Expirado',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      isActive: false
    }
  }

  return {
    label: 'Ativo',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    isActive: true
  }
}

const getAuditStatusBadge = (
  status: McpAuditLog['status']
): { label: string; badgeClass: string } => {
  if (status === 'success') {
    return {
      label: 'Permitido',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    }
  }
  if (status === 'forbidden') {
    return {
      label: 'Bloqueado',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    }
  }
  return {
    label: 'Erro',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30'
  }
}

const buildMcpJsonSnippet = (plainTextToken: string): string => {
  const origin = getApiOrigin()
  return JSON.stringify(
    {
      mcpServers: {
        dinheirizz: {
          url: `${origin}/api/mcp`,
          headers: {
            Authorization: `Bearer ${plainTextToken}`
          }
        }
      }
    },
    null,
    2
  )
}

export const McpIntegrationsSettings: React.FC = () => {
  const { data: tokens = [], isLoading: isTokensLoading } = useApiTokens()
  const createTokenMutation = useCreateApiToken()
  const revokeTokenMutation = useRevokeApiToken()

  const [tokenName, setTokenName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<ApiTokenScope[]>([...MCP_SCOPES])
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('none')
  const [revealedToken, setRevealedToken] = useState<CreateApiTokenResponse | null>(null)
  const [copiedTarget, setCopiedTarget] = useState<'token' | 'json' | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const { data: auditLogs = [], isLoading: isLogsLoading } = useMcpAuditLogs(isAuditOpen)

  const jsonSnippet = useMemo(() => {
    if (!revealedToken) return ''
    return buildMcpJsonSnippet(revealedToken.plainTextToken)
  }, [revealedToken])

  const handleToggleScope = (scope: ApiTokenScope): void => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]
    )
  }

  const handleCreateToken = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setFeedback(null)

    const trimmedName = tokenName.trim()
    if (trimmedName.length < 2) {
      setFeedback({
        type: 'error',
        message: 'Informe um nome com pelo menos 2 caracteres para identificar o cliente MCP.'
      })
      return
    }

    if (selectedScopes.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Selecione pelo menos um escopo somente leitura.'
      })
      return
    }

    const expiresInDays = expiryOption === 'none' ? null : Number(expiryOption)

    try {
      const result = await createTokenMutation.mutateAsync({
        name: trimmedName,
        scopes: selectedScopes,
        expiresInDays
      })
      setRevealedToken(result)
      setTokenName('')
      setExpiryOption('none')
      setSelectedScopes([...MCP_SCOPES])
      setCopiedTarget(null)
      setFeedback({
        type: 'success',
        message: `Token "${result.token.name}" criado com sucesso.`
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao criar token MCP.'
      setFeedback({ type: 'error', message: msg })
    }
  }

  const handleCopy = async (text: string, target: 'token' | 'json'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTarget(target)
      setTimeout(() => {
        setCopiedTarget((prev) => (prev === target ? null : prev))
      }, 2500)
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível copiar para a área de transferência.'
      })
    }
  }

  const handleConfirmRevoke = async (tokenId: string): Promise<void> => {
    setFeedback(null)
    try {
      await revokeTokenMutation.mutateAsync(tokenId)
      setConfirmRevokeId(null)
      setFeedback({
        type: 'success',
        message: 'Token MCP revogado imediatamente.'
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao revogar token MCP.'
      setFeedback({ type: 'error', message: msg })
    }
  }

  return (
    <div
      className="mt-6 pt-5 border-t border-border space-y-4"
      data-testid="mcp-integrations-section"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">
              Integrações &amp; MCP Pessoal
            </h4>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/25">
              <ShieldCheck className="w-3 h-3" />
              Somente Leitura
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Conecte Claude Desktop, Cursor ou Antigravity ao seu cofre Dinheirizz com tokens pessoais revogáveis.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          data-testid="mcp-feedback-banner"
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

      {revealedToken && (
        <div
          data-testid="mcp-token-reveal-card"
          className="p-3.5 rounded-xl bg-card border border-primary/40 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Token gerado: {revealedToken.token.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Copie este token agora. Por segurança, ele não será exibido novamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="mcp-dismiss-reveal-btn"
              onClick={() => setRevealedToken(null)}
              aria-label="Fechar exibição do token"
              className="min-h-[44px] px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              Ocultar
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-mono text-foreground break-all">
              {revealedToken.plainTextToken}
            </code>
            <button
              type="button"
              data-testid="mcp-copy-token-btn"
              onClick={() => void handleCopy(revealedToken.plainTextToken, 'token')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedTarget === 'token' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Token Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Token</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-foreground">
                Configuração JSON para Claude Desktop / Cursor / Antigravity
              </span>
              <button
                type="button"
                data-testid="mcp-copy-json-btn"
                onClick={() => void handleCopy(jsonSnippet, 'json')}
                className="min-h-[44px] px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedTarget === 'json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>JSON Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Configuração JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre
              data-testid="mcp-json-snippet"
              className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] font-mono text-foreground overflow-x-auto max-w-full"
            >
              {jsonSnippet}
            </pre>
          </div>
        </div>
      )}

      <form
        onSubmit={handleCreateToken}
        data-testid="mcp-create-token-form"
        className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_168px] gap-2.5">
          <div>
            <label
              htmlFor="mcp-token-name"
              className="block text-[11px] font-medium text-foreground mb-1"
            >
              Nome do cliente ou automação
            </label>
            <input
              id="mcp-token-name"
              data-testid="mcp-token-name-input"
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Ex: Claude Desktop, Cursor, n8n"
              maxLength={60}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-input/40 border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="mcp-token-expiry"
              className="block text-[11px] font-medium text-foreground mb-1"
            >
              Validade
            </label>
            <Select
              value={expiryOption}
              onValueChange={(value) => setExpiryOption(value as ExpiryOption)}
            >
              <SelectTrigger
                id="mcp-token-expiry"
                data-testid="mcp-token-expiry-select"
                aria-label="Validade do token MCP"
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem expiração</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">365 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-foreground">
            Escopos autorizados (somente leitura)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {MCP_SCOPES.map((scope) => {
              const checked = selectedScopes.includes(scope)
              return (
                <label
                  key={scope}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-border bg-card/60 hover:bg-muted/40 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    data-testid={`mcp-scope-checkbox-${scope}`}
                    checked={checked}
                    onChange={() => handleToggleScope(scope)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-foreground truncate">
                      {MCP_SCOPE_LABELS[scope]}
                    </span>
                    <span className="block text-[10px] font-mono text-muted-foreground truncate">
                      {scope}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            data-testid="mcp-create-token-btn"
            disabled={
              createTokenMutation.isPending ||
              selectedScopes.length === 0 ||
              tokenName.trim().length < 2
            }
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {createTokenMutation.isPending ? 'Gerando Token...' : 'Gerar Token MCP'}
            </span>
          </button>
        </div>
      </form>

      {isTokensLoading ? (
        <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Carregando tokens MCP...</span>
        </div>
      ) : tokens.length === 0 ? (
        <div
          data-testid="mcp-tokens-empty-state"
          className="p-4 rounded-xl bg-muted/30 border border-border text-center space-y-1"
        >
          <p className="text-xs font-medium text-foreground">
            Nenhum token MCP criado ainda
          </p>
          <p className="text-[11px] text-muted-foreground">
            Gere um token acima para conectar seus clientes de IA ao Dinheirizz.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="mcp-tokens-list">
          {tokens.map((item) => {
            const status = getTokenStatus(item)
            const isConfirming = confirmRevokeId === item.id

            return (
              <div
                key={item.id}
                data-testid={`mcp-token-card-${item.id}`}
                className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                      <code className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-card border border-border">
                        {item.tokenPrefix}
                      </code>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Último uso: {formatDateTime(item.lastUsedAt)}
                    </p>
                  </div>

                  {status.isActive && (
                    <button
                      type="button"
                      data-testid={`mcp-revoke-token-btn-${item.id}`}
                      onClick={() => setConfirmRevokeId(item.id)}
                      disabled={revokeTokenMutation.isPending}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revogar</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {item.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground"
                    >
                      {scope}
                    </span>
                  ))}
                </div>

                {isConfirming && (
                  <div
                    data-testid={`mcp-revoke-confirm-box-${item.id}`}
                    className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <span className="text-xs text-foreground">
                      Confirmar revogação imediata de {item.name}?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`mcp-cancel-revoke-btn-${item.id}`}
                        onClick={() => setConfirmRevokeId(null)}
                        disabled={revokeTokenMutation.isPending}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        data-testid={`mcp-confirm-revoke-btn-${item.id}`}
                        onClick={() => void handleConfirmRevoke(item.id)}
                        disabled={revokeTokenMutation.isPending}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {revokeTokenMutation.isPending ? 'Revogando...' : 'Confirmar revogação'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <button
          type="button"
          data-testid="mcp-audit-toggle-btn"
          aria-expanded={isAuditOpen}
          onClick={() => setIsAuditOpen((prev) => !prev)}
          className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Auditoria de Acessos MCP</span>
          </span>
          {isAuditOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {isAuditOpen && (
          <div
            data-testid="mcp-audit-logs-list"
            className="px-3.5 pb-3.5 pt-1 border-t border-border/60 space-y-2"
          >
            {isLogsLoading ? (
              <p className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Carregando logs de auditoria...</span>
              </p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Nenhuma chamada MCP registrada até o momento.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {auditLogs.map((log) => {
                  const badge = getAuditStatusBadge(log.status)
                  return (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-lg bg-card border border-border text-xs"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <code className="text-[11px] font-mono font-semibold text-foreground truncate">
                          {log.toolName}
                        </code>
                        <span className="text-[11px] text-muted-foreground truncate">
                          ({log.tokenName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-tabular">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
