import React, { useRef, useState } from 'react'
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Building2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBRL } from '../../lib/formatters'
import { useImportStatement } from '../../hooks/useImportStatement'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import type { ParsedTransactionCandidate } from '../../types/import'
import type { TransactionItem } from '../dashboard/Dashboard'
import type { CategoryItem } from '../../hooks/useCategories'

const NO_CATEGORY_VALUE = '__none__'

export interface ImportStatementModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: Array<{
    id: string
    name: string
    balance: number | string
    type?: string
  }>
  categories: CategoryItem[]
  existingTransactions?: TransactionItem[]
  onSuccess?: (importedCount: number) => void
  onDemoImport?: (imported: ParsedTransactionCandidate[], accountId: string) => void
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  existingTransactions = [],
  onSuccess,
  onDemoImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const defaultAccountId = accounts.length > 0 ? accounts[0].id : ''

  const {
    selectedAccountId,
    setSelectedAccountId,
    isProcessingFile,
    isImporting,
    error,
    parsedResult,
    stagingTransactions,
    selectedCount,
    duplicateCount,
    selectedIncomeTotal,
    selectedExpenseTotal,
    handleFileSelected,
    toggleSelectTransaction,
    selectAll,
    deselectDuplicates,
    invertSelection,
    updateCandidateCategory,
    toggleCandidateType,
    updateCandidateDescription,
    updateCandidateDate,
    executeImport,
    reset
  } = useImportStatement({
    initialAccountId: defaultAccountId,
    existingTransactions,
    availableCategories: categories,
    onDemoImport
  })

  if (!isOpen) return null

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelected(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelected(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleConfirm = async () => {
    try {
      await executeImport((count) => {
        toast.success(count === 1 ? '1 transação importada com sucesso!' : `${count} transações importadas com sucesso!`)
        if (onSuccess) {
          onSuccess(count)
        }
        handleClose()
      })
    } catch {
      // Error is caught and set in hook state
    }
  }

  return (
    <div
      data-testid="import-statement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="import-modal-title" className="text-lg font-semibold tracking-tight text-foreground">
                  Importar Extrato Bancário
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  OFX • CSV • PDF
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Conciliação inteligente e auto-categorização automática de lançamentos
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-import-modal-btn"
            onClick={handleClose}
            className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Account Selector */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <label htmlFor="import-account-select" className="font-medium">
                Conta de Destino:
              </label>
            </div>
            <Select value={selectedAccountId || undefined} onValueChange={setSelectedAccountId}>
              <SelectTrigger
                id="import-account-select"
                data-testid="import-account-select"
                aria-label="Conta de Destino"
                className="w-full sm:w-72"
              >
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <span>{acc.name}</span>
                      <span className="text-muted-foreground font-tabular">
                        ({formatBRL(Number(acc.balance) || 0)})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              data-testid="import-error-banner"
              className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-rose-200">Não foi possível processar o arquivo</p>
                <p className="mt-1 text-xs text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Upload Dropzone (When no transactions yet) */}
          {stagingTransactions.length === 0 ? (
            <div
              data-testid="statement-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center ${
                isDragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-border/80 hover:border-muted-foreground/50 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                data-testid="statement-file-input"
                accept=".ofx,.csv,.tsv,.txt,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Selecionar arquivo de extrato"
              />

              {isProcessingFile ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <p className="text-sm font-medium text-foreground">Processando extrato bancário...</p>
                  <p className="text-xs text-muted-foreground">Extraindo transações e verificando duplicatas</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-foreground border border-border mb-4 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">
                    Arraste seu extrato bancário aqui ou clique para buscar
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mb-4">
                    Suporte universal a arquivos OFX, CSV e extratos digitais em PDF de bancos brasileiros (Nubank, Itaú, Inter, Bradesco, etc.)
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground font-medium border border-border">
                    Limite de tamanho: até 10MB
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Step 2: Staging Table & Summary */
            <div className="space-y-4">
              {/* Summary Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-xs text-muted-foreground">Total Selecionado</span>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {selectedCount} <span className="text-xs font-normal text-muted-foreground">/ {stagingTransactions.length}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-xs text-muted-foreground">Receitas (+)</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {formatBRL(selectedIncomeTotal)}
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-xs text-muted-foreground">Despesas (-)</span>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {formatBRL(selectedExpenseTotal)}
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-xs text-muted-foreground">Possíveis Duplicatas</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-lg font-bold ${duplicateCount > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {duplicateCount}
                    </span>
                    {duplicateCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Desmarcadas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Convenience Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="select-all-btn"
                    onClick={selectAll}
                    className="h-10 min-h-[44px] px-3 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground border border-border transition-colors flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Marcar Todas
                  </button>

                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      data-testid="deselect-duplicates-btn"
                      onClick={deselectDuplicates}
                      className="h-10 min-h-[44px] px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Desmarcar Duplicatas
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="invert-selection-btn"
                    onClick={invertSelection}
                    className="h-10 min-h-[44px] px-3 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground border border-border transition-colors"
                  >
                    Inverter
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="change-file-btn"
                  onClick={reset}
                  className="h-10 min-h-[44px] px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Trocar Arquivo ({parsedResult?.fileName})
                </button>
              </div>

              {/* Transactions List (Responsive: Cards on Mobile, Table on Desktop) */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
                  {stagingTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className={`p-3.5 transition-colors flex flex-col md:flex-row md:items-center gap-3 ${
                        tx.selected ? 'bg-muted/20' : 'opacity-60 bg-muted/5'
                      }`}
                    >
                      {/* Checkbox and Basic info */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          data-testid={`select-transaction-${tx.id}`}
                          onClick={() => toggleSelectTransaction(tx.id)}
                          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground"
                          aria-label={`Selecionar ${tx.description}`}
                        >
                          {tx.selected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>

                        <DatePicker
                          dataTestId={`input-date-${tx.id}`}
                          ariaLabel={`Data de ${tx.description}`}
                          value={tx.date}
                          onChange={(val) => updateCandidateDate(tx.id, val)}
                          className="w-auto min-w-[140px]"
                        />
                      </div>

                      {/* Description & Duplicate Badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            data-testid={`input-description-${tx.id}`}
                            value={tx.description}
                            onChange={(e) => updateCandidateDescription(tx.id, e.target.value)}
                            className="w-full h-10 min-h-[44px] px-2.5 bg-input/40 border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        {tx.isDuplicate && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              data-testid="duplicate-badge"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Possível Duplicata
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {tx.duplicateReason}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Category Selector with source badge */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={tx.categoryId || NO_CATEGORY_VALUE}
                          onValueChange={(val) => {
                            const nextId = val === NO_CATEGORY_VALUE ? '' : val
                            const found = categories.find((c) => c.id === nextId)
                            updateCandidateCategory(tx.id, nextId, found?.name)
                          }}
                        >
                          <SelectTrigger
                            data-testid={`select-category-${tx.id}`}
                            aria-label={`Categoria de ${tx.description}`}
                            className="w-auto min-w-[140px] max-w-[180px]"
                          >
                            <SelectValue placeholder="Sem Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_CATEGORY_VALUE}>Sem Categoria</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {tx.categorySource && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-semibold ${
                              tx.categorySource === 'rule'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : tx.categorySource === 'history'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : tx.categorySource === 'ai'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {tx.categorySource}
                          </span>
                        )}
                      </div>

                      {/* Type Toggle & Amount */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        <button
                          type="button"
                          data-testid={`toggle-type-${tx.id}`}
                          onClick={() => toggleCandidateType(tx.id)}
                          className={`flex items-center gap-1 h-10 min-h-[44px] px-2.5 rounded text-xs font-semibold transition-colors ${
                            tx.type === 'income'
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Receita
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              Despesa
                            </>
                          )}
                        </button>

                        <span
                          data-testid={`amount-${tx.id}`}
                          className={`text-sm font-semibold whitespace-nowrap min-w-[90px] text-right tabular-nums ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-card/90">
          <button
            type="button"
            onClick={handleClose}
            className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>

          {stagingTransactions.length > 0 && (
            <button
              type="button"
              data-testid="confirm-import-btn"
              disabled={selectedCount === 0 || isImporting}
              onClick={handleConfirm}
              className="flex items-center gap-2 h-11 min-h-[44px] px-5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Importação ({selectedCount} {selectedCount === 1 ? 'lançamento' : 'lançamentos'})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
