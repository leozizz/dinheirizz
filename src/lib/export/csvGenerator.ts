export interface ExportTransactionItem {
  id: string
  occurredAt: string
  description?: string | null
  type: 'income' | 'expense' | 'transfer'
  categoryName?: string | null
  accountName?: string | null
  creditCardName?: string | null
  installment?: string | null
  status: 'completed' | 'pending' | 'canceled' | string
  paidAt?: string | null
  amount: number
  notes?: string | null
}

export interface CsvGeneratorOptions {
  delimiter?: string
  includeBom?: boolean
}

const padZero = (n: number): string => n.toString().padStart(2, '0')

const formatDateBR = (isoDateString?: string | null): string => {
  if (!isoDateString) return ''
  const d = new Date(isoDateString)
  if (isNaN(d.getTime())) return ''
  return `${padZero(d.getUTCDate())}/${padZero(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

const formatNumberBR = (value: number): string => {
  return value.toFixed(2).replace('.', ',')
}

const escapeCsvField = (
  value: string | number | null | undefined,
  delimiter: string
): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const generateTransactionsCSV = (
  transactions: ExportTransactionItem[],
  options?: CsvGeneratorOptions
): string => {
  const delimiter = options?.delimiter ?? ';'
  const includeBom = options?.includeBom ?? true

  const headers = [
    'Data',
    'Descrição',
    'Tipo',
    'Categoria',
    'Centro de Custo / Conta',
    'Forma / Cartão',
    'Status',
    'Data de Pagamento',
    'Valor (R$)',
    'Observações'
  ]

  const rows: string[] = []
  rows.push(headers.map((h) => escapeCsvField(h, delimiter)).join(delimiter))

  for (const tx of transactions) {
    const typeDisplay =
      tx.type === 'income'
        ? 'Receita'
        : tx.type === 'expense'
        ? 'Despesa'
        : 'Transferência'

    const statusDisplay =
      tx.status === 'completed'
        ? 'Concluído'
        : tx.status === 'pending'
        ? 'Pendente'
        : 'Cancelado'

    const category = tx.categoryName || 'Sem Categoria'
    const account = tx.accountName || 'Conta Não Identificada'

    let paymentMethod = account
    if (tx.creditCardName) {
      if (tx.installment) {
        paymentMethod = `${tx.creditCardName} (${tx.installment})`
      } else {
        paymentMethod = tx.creditCardName
      }
    }

    const row = [
      formatDateBR(tx.occurredAt),
      escapeCsvField(tx.description || 'Sem Descrição', delimiter),
      escapeCsvField(typeDisplay, delimiter),
      escapeCsvField(category, delimiter),
      escapeCsvField(account, delimiter),
      escapeCsvField(paymentMethod, delimiter),
      escapeCsvField(statusDisplay, delimiter),
      formatDateBR(tx.paidAt),
      formatNumberBR(tx.amount),
      escapeCsvField(tx.notes || '', delimiter)
    ]

    rows.push(row.join(delimiter))
  }

  const csvBody = rows.join('\r\n')
  return includeBom ? '\uFEFF' + csvBody : csvBody
}

export const downloadCSV = (filename: string, csvContent: string): void => {
  if (typeof window === 'undefined') return

  // Assegura que o blob contenha o BOM UTF-8 caso ainda não esteja presente
  const content = csvContent.startsWith('\uFEFF')
    ? csvContent
    : '\uFEFF' + csvContent

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
