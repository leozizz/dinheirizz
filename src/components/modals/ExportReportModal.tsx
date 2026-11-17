import React, { useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  X,
  Download,
  Printer,
  Building2,
  CheckCircle2,
  ListFilter,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { formatBRL } from '../../lib/formatters'
import { useReportSummary, useReportExport } from '../../hooks/useReportExport'
import type { ReportFilterInput } from '../../schemas/reports'
import type { ExportTransactionItem } from '../../lib/export/csvGenerator'

export interface ExportReportModalProps {
  isOpen: boolean
  onClose: () => void
  accounts?: Array<{ id: string; name: string }>
  existingTransactions?: ExportTransactionItem[]
  onExportCSV?: (filters: ReportFilterInput) => Promise<void> | void
  onExportPDF?: (filters: ReportFilterInput) => Promise<void> | void
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
]

const YEARS = ['2026', '2025', '2024', '2023']

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  existingTransactions = [],
  onExportCSV,
  onExportPDF
}) => {
  const currentDate = new Date()
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0')
  const currentYearStr = String(currentDate.getFullYear())

  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [status, setStatus] = useState<'completed' | 'all'>('completed')
  const [isExporting, setIsExporting] = useState<boolean>(false)

  const activePeriod =
    periodType === 'monthly' ? `${selectedYear}-${selectedMonth}` : selectedYear

  const currentFilters: ReportFilterInput = {
    periodType,
    period: activePeriod,
    accountId: selectedAccountId ? selectedAccountId : undefined,
    status
  }

  const { data: summary, isLoading: isSummaryLoading } = useReportSummary(currentFilters)
  const { downloadReportCSV, fetchPdfData } = useReportExport()

  if (!isOpen) return null

  const handleFormatChange = (newFormat: 'pdf' | 'csv') => {
    setFormat(newFormat)
  }

  const handlePeriodTypeChange = (newPeriodType: 'monthly' | 'yearly') => {
    setPeriodType(newPeriodType)
  }

  const handleSubmit = async () => {
    setIsExporting(true)
    try {
      if (format === 'csv') {
        if (onExportCSV) {
          await onExportCSV(currentFilters)
        } else {
          await downloadReportCSV(currentFilters, existingTransactions)
        }
      } else {
        if (onExportPDF) {
          await onExportPDF(currentFilters)
        } else {
          await fetchPdfData(currentFilters, existingTransactions)
          if (typeof window !== 'undefined') {
            window.print()
          }
        }
      }
    } finally {
      setIsExporting(false)
    }
  }

  const kpis = summary?.kpis
  const topCategories = summary?.categoriesBreakdown?.slice(0, 3) || []

  return (
    <div
      data-testid="export-report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="text-base sm:text-lg font-bold text-foreground font-display"
              >
                Exportar Relatórios Financeiros
              </h2>
              <p className="text-xs text-muted-foreground">
                Gere demonstrativos executivos em PDF ou planilhas contábeis em CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="export-close-btn"
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* 1. Seletor de Formato */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Formato de Exportação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="format-pdf-btn"
                onClick={() => handleFormatChange('pdf')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer min-h-[44px] ${
                  format === 'pdf'
                    ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-sm'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    format === 'pdf' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">PDF Executivo</div>
                  <div className="text-[11px] text-muted-foreground">
                    Balancete formatado A4 para IRPF/MEI
                  </div>
                </div>
              </button>

              <button
                type="button"
                data-testid="format-csv-btn"
                onClick={() => handleFormatChange('csv')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer min-h-[44px] ${
                  format === 'csv'
                    ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-sm'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    format === 'csv' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">Planilha CSV</div>
                  <div className="text-[11px] text-muted-foreground">
                    Padrão pt-BR (RFC 4180 com BOM)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Seleção de Período e Tipo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Período de Referência
              </label>
              {/* Alternador Mensal / Anual */}
              <div className="flex p-0.5 bg-muted/60 border border-border rounded-lg">
                <button
                  type="button"
                  data-testid="period-type-monthly-btn"
                  onClick={() => handlePeriodTypeChange('monthly')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer min-h-[32px] ${
                    periodType === 'monthly'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  data-testid="period-type-yearly-btn"
                  onClick={() => handlePeriodTypeChange('yearly')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer min-h-[32px] ${
                    periodType === 'yearly'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Anual (Exercício)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {periodType === 'monthly' && (
                <div>
                  <label
                    htmlFor="period-month-select"
                    className="text-xs text-muted-foreground mb-1 block"
                  >
                    Mês de Referência
                  </label>
                  <select
                    id="period-month-select"
                    data-testid="period-month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value} className="bg-popover text-foreground">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="period-year-select"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Ano {periodType === 'yearly' ? 'Fiscal' : ''}
                </label>
                <select
                  id="period-year-select"
                  data-testid="period-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-popover text-foreground">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Filtros Avançados: Conta / Centro de Custo e Regime */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="account-filter-select"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
              >
                Centro de Custo / Conta
              </label>
              <select
                id="account-filter-select"
                data-testid="account-filter-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="" className="bg-popover text-foreground">
                  Todas as Contas (Consolidado Geral)
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-popover text-foreground">
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Regime Contábil
              </label>
              <div className="flex h-11 p-0.5 bg-input border border-border rounded-xl">
                <button
                  type="button"
                  data-testid="status-completed-btn"
                  onClick={() => setStatus('completed')}
                  className={`flex-1 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[38px] ${
                    status === 'completed'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Regime de Caixa (Liquidadas)
                </button>
                <button
                  type="button"
                  data-testid="status-all-btn"
                  onClick={() => setStatus('all')}
                  className={`flex-1 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[38px] ${
                    status === 'all'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Competência (Todas)
                </button>
              </div>
            </div>
          </div>

          {/* 4. Pré-visualização Instantânea dos Dados */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Pré-visualização do Relatório
              </span>
              <span className="text-[11px] text-muted-foreground">
                {isSummaryLoading ? 'Atualizando...' : `${activePeriod} (${status === 'completed' ? 'Caixa' : 'Competência'})`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Receitas</span>
                <span
                  data-testid="export-preview-income"
                  className="text-sm font-bold text-emerald-400 font-tabular block mt-0.5"
                >
                  {formatBRL(kpis?.totalIncome ?? 0)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Despesas</span>
                <span
                  data-testid="export-preview-expense"
                  className="text-sm font-bold text-rose-400 font-tabular block mt-0.5"
                >
                  {formatBRL(kpis?.totalExpense ?? 0)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Saldo Líquido</span>
                <span
                  data-testid="export-preview-net"
                  className={`text-sm font-bold font-tabular block mt-0.5 ${
                    (kpis?.netBalance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(kpis?.netBalance ?? 0)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Lançamentos</span>
                <span
                  data-testid="export-preview-count"
                  className="text-sm font-bold text-foreground font-tabular block mt-0.5"
                >
                  {kpis?.transactionCount ?? 0}
                </span>
              </div>
            </div>

            {/* Top Categorias Resumo */}
            {topCategories.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Maiores Categorias do Período
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {topCategories.map((cat, idx) => (
                    <span
                      key={cat.categoryId || `cat-preview-${idx}`}
                      className="px-2 py-0.5 rounded-md bg-muted/60 border border-border text-[11px] font-medium text-foreground flex items-center gap-1"
                    >
                      <span className="truncate max-w-[120px]">{cat.categoryName}</span>
                      <span className="font-tabular font-semibold text-muted-foreground">
                        {formatBRL(cat.amount)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-border bg-card/90">
          <button
            type="button"
            data-testid="export-cancel-btn"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid={format === 'csv' ? 'export-csv-btn' : 'export-pdf-btn'}
            onClick={handleSubmit}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold flex items-center gap-2 hover:opacity-95 transition-all shadow-md shadow-primary/20 cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            {format === 'csv' ? (
              <>
                <Download className="w-4 h-4" />
                <span data-testid="export-submit-btn">
                  {isExporting ? 'Exportando Planilha...' : 'Baixar Planilha CSV'}
                </span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span data-testid="export-submit-btn">
                  {isExporting ? 'Gerando Documento...' : 'Gerar & Imprimir PDF'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
