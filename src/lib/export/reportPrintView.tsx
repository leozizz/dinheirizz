import React from 'react'
import { formatBRL } from '../formatters'
import type { ReportPdfData } from '../../hooks/useReportExport'

export interface ReportPrintViewProps {
  data: ReportPdfData
}

const formatDateBR = (isoDateString?: string | null): string => {
  if (!isoDateString) return '-'
  const d = new Date(isoDateString)
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

const formatPeriodTitle = (periodType: 'monthly' | 'yearly', period: string): string => {
  if (periodType === 'yearly') {
    return `Exercício Fiscal de ${period}`
  }
  const parts = period.split('-')
  if (parts.length === 2) {
    const monthIndex = parseInt(parts[1], 10) - 1
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro'
    ]
    const monthName = months[monthIndex] || parts[1]
    return `Período Mensal de ${monthName} de ${parts[0]}`
  }
  return `Período ${period}`
}

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({ data }) => {
  const { user, summary, transactions, hash } = data
  const { kpis, categoriesBreakdown, costCentersSummary, cashFlowTimeline } = summary

  const emissionDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Cálculo de alturas relativas para o gráfico SVG
  const maxBarValue = Math.max(
    ...cashFlowTimeline.map((p) => Math.max(p.income, p.expense)),
    1000
  )

  return (
    <div
      data-testid="report-print-view"
      className="print-view-document w-full max-w-4xl mx-auto p-8 bg-white text-slate-900 font-sans"
    >
      {/* 1. Cabeçalho Institucional */}
      <header className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold tracking-tight text-2xl text-slate-950 font-display">
              DINHEIRIZZ
            </span>
            <span className="text-xs uppercase px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-300">
              Contabilidade & Gestão
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2">
            Relatório Financeiro Executivo & Balancete Contábil
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-0.5">
            {formatPeriodTitle(summary.periodType, summary.period)}
          </p>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
          <div>
            <span className="font-semibold text-slate-800">Titular: </span>
            <span>{user.name}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-800">Email: </span>
            <span>{user.email}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-800">Emissão: </span>
            <span>{emissionDate}</span>
          </div>
          {hash && (
            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[260px]">
              SHA-256: {hash.substring(0, 16)}...
            </div>
          )}
        </div>
      </header>

      {/* 2. Sumário Executivo — Cards de KPIs */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          1. Indicadores Financeiros Consolidados (KPIs)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Receitas Realizadas
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-700 font-tabular mt-0.5 block">
              {formatBRL(kpis.totalIncome)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Despesas Realizadas
            </span>
            <span className="text-base sm:text-lg font-bold text-rose-700 font-tabular mt-0.5 block">
              {formatBRL(kpis.totalExpense)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Resultado Líquido
            </span>
            <span
              className={`text-base sm:text-lg font-bold font-tabular mt-0.5 block ${
                kpis.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatBRL(kpis.netBalance)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Margem de Poupança
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-tabular mt-0.5 block">
              {kpis.savingsRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {kpis.transactionCount} lançamentos
            </span>
          </div>
        </div>
      </section>

      {/* 3. Gráfico Vetorial de Fluxo de Caixa */}
      {cashFlowTimeline.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            2. Evolução de Fluxo de Caixa (Receitas vs Despesas)
          </h2>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-600 rounded-sm inline-block" />
                  Receitas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-600 rounded-sm inline-block" />
                  Despesas
                </span>
              </div>
              <span className="text-[11px]">Valores em R$ (Escala Proporcional)</span>
            </div>

            {/* SVG Histogram */}
            <svg
              className="w-full h-32 overflow-visible"
              viewBox={`0 0 ${cashFlowTimeline.length * 50 + 20} 100`}
              preserveAspectRatio="none"
            >
              {cashFlowTimeline.map((item, idx) => {
                const colX = 15 + idx * 50
                const incomeHeight = Math.min(80, (item.income / maxBarValue) * 80)
                const expenseHeight = Math.min(80, (item.expense / maxBarValue) * 80)

                return (
                  <g key={`bar-${idx}`}>
                    {/* Barra de Receita */}
                    <rect
                      x={colX}
                      y={85 - incomeHeight}
                      width={16}
                      height={Math.max(2, incomeHeight)}
                      fill="#059669"
                      rx={2}
                    />
                    {/* Barra de Despesa */}
                    <rect
                      x={colX + 18}
                      y={85 - expenseHeight}
                      width={16}
                      height={Math.max(2, expenseHeight)}
                      fill="#e11d48"
                      rx={2}
                    />
                    {/* Rótulo da Coluna */}
                    <text
                      x={colX + 17}
                      y={98}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#475569"
                      fontFamily="sans-serif"
                    >
                      {item.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </section>
      )}

      {/* 4. Balancete Sintético por Categorias */}
      {categoriesBreakdown.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            3. Balancete Sintético por Categorias
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Natureza</th>
                  <th className="py-2.5 px-3 text-right">Total (R$)</th>
                  <th className="py-2.5 px-3 text-right">Part. (%)</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categoriesBreakdown.map((cat, idx) => (
                  <tr key={cat.categoryId || `cat-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-900">{cat.categoryName}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          cat.type === 'income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cat.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-tabular font-semibold text-slate-900">
                      {formatBRL(cat.amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-tabular text-slate-600">
                      {cat.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right font-tabular text-slate-600">{cat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Centros de Custo / Contas */}
      {costCentersSummary.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            4. Balanço por Centros de Custo / Contas Bancárias
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Centro de Custo / Conta</th>
                  <th className="py-2.5 px-3 text-right">Receitas</th>
                  <th className="py-2.5 px-3 text-right">Despesas</th>
                  <th className="py-2.5 px-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {costCentersSummary.map((acc) => (
                  <tr key={acc.accountId} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-900">{acc.accountName}</td>
                    <td className="py-2 px-3 text-right font-tabular text-emerald-700">
                      {formatBRL(acc.income)}
                    </td>
                    <td className="py-2 px-3 text-right font-tabular text-rose-700">
                      {formatBRL(acc.expense)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-tabular font-semibold ${
                        acc.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatBRL(acc.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Extrato Analítico Discriminado */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            5. Extrato Analítico de Movimentações
          </h2>
          <span className="text-[11px] text-slate-500">{transactions.length} registros</span>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Conta / Forma</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((tx) => {
                const method = tx.creditCardName
                  ? tx.installment
                    ? `${tx.creditCardName} (${tx.installment})`
                    : tx.creditCardName
                  : tx.accountName || '-'

                return (
                  <tr key={tx.id} className="break-inside-avoid hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-600 font-tabular whitespace-nowrap">
                      {formatDateBR(tx.occurredAt)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                      {tx.description || 'Sem Descrição'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{tx.categoryName || 'Sem Categoria'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">{method}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          tx.status === 'completed'
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.status === 'completed' ? 'Liquidado' : 'Pendente'}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-tabular font-semibold whitespace-nowrap ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Rodapé de Conformidade & Autenticidade */}
      <footer className="border-t border-slate-300 pt-4 mt-8 break-inside-avoid text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p>
          Documento gerado eletronicamente pela plataforma Dinheirizz 2.0. Válido para prestação de
          contas contábil, conciliação e declaração de IRPF / MEI.
        </p>
        <span className="font-semibold text-slate-700 shrink-0">Dinheirizz S.A.</span>
      </footer>
    </div>
  )
}
