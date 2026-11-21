import { suggestLocalCategories } from './categorization'
import type { CategoryItem } from '../hooks/useCategories'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { AccountOption, CreditCardOption } from '../components/modals/TransactionModal'
import type { ParsedTransactionCandidate } from '../types/import'

export interface NlpParseContext {
  accounts: AccountOption[]
  creditCards?: CreditCardOption[]
  categories: CategoryItem[]
  existingTransactions?: TransactionItem[]
  referenceDate?: Date
}

export interface ParsedNlpTransaction {
  rawInput: string
  description: string
  amount: number | null
  type: 'income' | 'expense'
  occurredAt: string // Formato YYYY-MM-DD
  dateLabel: string // Ex.: 'Hoje', 'Ontem', 'Amanhã', '15/11'
  accountId?: string
  accountName?: string
  creditCardId?: string
  creditCardName?: string
  categoryId?: string
  categoryName?: string
  isValidTransaction: boolean
}

const INCOME_KEYWORDS = [
  'pix recebido',
  'recebi',
  'recebido',
  'salario',
  'reembolso',
  'freela',
  'entrada',
  'rendimento',
  'ganhei',
  'deposito'
]

const CONNECTOR_PREPOSITIONS = new Set(['no', 'na', 'pelo', 'pela', 'via', 'com', 'em', 'do', 'da'])

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const formatIsoDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  next.setDate(next.getDate() + days)
  return next
}

interface ExtractedDateResult {
  occurredAt: string
  dateLabel: string
  remainingText: string
}

const extractDate = (input: string, referenceDate: Date): ExtractedDateResult => {
  // 1. Data explícita dd/mm/yyyy ou dd/mm
  const explicitMatch = input.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/)
  if (explicitMatch) {
    const day = Number(explicitMatch[1])
    const month = Number(explicitMatch[2])
    const rawYear = explicitMatch[3]
    const year = rawYear
      ? rawYear.length === 2
        ? 2000 + Number(rawYear)
        : Number(rawYear)
      : referenceDate.getFullYear()

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const parsed = new Date(year, month - 1, day)
      const label = rawYear
        ? `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
        : `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
      return {
        occurredAt: formatIsoDate(parsed),
        dateLabel: label,
        remainingText: input.replace(explicitMatch[0], ' ').trim()
      }
    }
  }

  // 2. Datas relativas PT-BR
  const relativeRules: Array<{ pattern: RegExp; offset: number; label: string }> = [
    { pattern: /(?:^|\s)anteontem(?=\s|$)/i, offset: -2, label: 'Anteontem' },
    { pattern: /(?:^|\s)ontem(?=\s|$)/i, offset: -1, label: 'Ontem' },
    { pattern: /(?:^|\s)hoje(?=\s|$)/i, offset: 0, label: 'Hoje' },
    { pattern: /(?:^|\s)amanh[aã](?=\s|$)/i, offset: 1, label: 'Amanhã' }
  ]

  for (const rule of relativeRules) {
    const match = input.match(rule.pattern)
    if (match) {
      const target = addDays(referenceDate, rule.offset)
      return {
        occurredAt: formatIsoDate(target),
        dateLabel: rule.label,
        remainingText: input.replace(match[0], ' ').trim()
      }
    }
  }

  return {
    occurredAt: formatIsoDate(referenceDate),
    dateLabel: 'Hoje',
    remainingText: input
  }
}

interface ExtractedAmountResult {
  amount: number | null
  remainingText: string
}

const parseMonetaryString = (raw: string): number | null => {
  let cleaned = raw.trim()
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Formato PT-BR com milhar: 1.250,90
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    // Formato PT-BR decimal: 185,50
    cleaned = cleaned.replace(',', '.')
  }
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

const extractAmount = (input: string): ExtractedAmountResult => {
  const amountRegex = /(?:^|\s)(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+,\d{1,2}|\d+\.\d{1,2}|\d+)(?=\s|$)/i
  const match = input.match(amountRegex)
  if (!match) {
    return { amount: null, remainingText: input }
  }

  const parsed = parseMonetaryString(match[1])
  if (parsed === null) {
    return { amount: null, remainingText: input }
  }

  return {
    amount: parsed,
    remainingText: input.replace(match[0], ' ').trim()
  }
}

const detectType = (rawInput: string): 'income' | 'expense' => {
  const normalized = normalizeText(rawInput)
  for (const kw of INCOME_KEYWORDS) {
    const regex = new RegExp(`(?:^|\\s)${kw}(?=\\s|$)`, 'i')
    if (regex.test(normalized)) {
      return 'income'
    }
  }
  return 'expense'
}

interface MatchedPaymentSource {
  accountId?: string
  accountName?: string
  creditCardId?: string
  creditCardName?: string
  remainingText: string
}

const removeMatchedTokensAndPrepositions = (text: string, matchedWords: string[]): string => {
  const tokens = text.split(/\s+/).filter(Boolean)
  const matchedSet = new Set(matchedWords.map((w) => normalizeText(w)))
  const kept: string[] = []

  for (let i = 0; i < tokens.length; i += 1) {
    const norm = normalizeText(tokens[i])
    if (matchedSet.has(norm)) {
      // Remove preposição conectora imediatamente anterior se existir
      if (kept.length > 0 && CONNECTOR_PREPOSITIONS.has(normalizeText(kept[kept.length - 1]))) {
        kept.pop()
      }
      continue
    }
    kept.push(tokens[i])
  }

  return kept.join(' ').trim()
}

const matchAccountOrCard = (
  text: string,
  accounts: AccountOption[],
  creditCards: CreditCardOption[]
): MatchedPaymentSource => {
  const words = text.split(/\s+/).filter(Boolean)
  const normWords = words.map((w) => normalizeText(w)).filter((w) => w.length >= 3 && !CONNECTOR_PREPOSITIONS.has(w))

  if (normWords.length === 0) {
    return { remainingText: text }
  }

  let bestScore = 0
  let bestKind: 'account' | 'card' | null = null
  let bestId: string | undefined
  let bestName: string | undefined
  let bestMatchedTokens: string[] = []

  const evaluateCandidate = (id: string, name: string, kind: 'account' | 'card') => {
    const normName = normalizeText(name)
    const nameTokens = normName.split(/\s+/).filter((t) => t.length >= 2)
    const matchedTokens: string[] = []

    for (const w of normWords) {
      const hitsToken = nameTokens.some((nt) => nt === w || nt.includes(w) || (w.length >= 4 && w.includes(nt)))
      if (hitsToken) {
        matchedTokens.push(w)
      }
    }

    if (matchedTokens.length === 0) return

    // Pontuação prioriza mais palavras correspondentes, depois cobertura do nome e preferência por conta em empate exato
    const coverage = matchedTokens.length / Math.max(nameTokens.length, 1)
    const exactMatchBonus = matchedTokens.some((m) => nameTokens.includes(m)) ? 1 : 0
    const kindTieBreaker = kind === 'account' ? 0.05 : 0
    const score = matchedTokens.length * 10 + exactMatchBonus * 2 + coverage + kindTieBreaker

    if (score > bestScore) {
      bestScore = score
      bestKind = kind
      bestId = id
      bestName = name
      bestMatchedTokens = matchedTokens
    }
  }

  for (const acc of accounts) {
    evaluateCandidate(acc.id, acc.name, 'account')
  }

  for (const card of creditCards) {
    evaluateCandidate(card.id, card.name, 'card')
  }

  if (!bestKind || !bestId || !bestName) {
    return { remainingText: text }
  }

  const remainingText = removeMatchedTokensAndPrepositions(text, bestMatchedTokens)

  if (bestKind === 'card') {
    return {
      creditCardId: bestId,
      creditCardName: bestName,
      remainingText
    }
  }

  return {
    accountId: bestId,
    accountName: bestName,
    remainingText
  }
}

const cleanDescription = (text: string, type: 'income' | 'expense'): string => {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (!collapsed) {
    return type === 'income' ? 'Receita' : 'Despesa'
  }
  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1)
}

/**
 * Faz o parsing determinístico local de uma linha de texto em Português (PT-BR)
 * para extrair valor, tipo, data, conta/cartão, descrição limpa e categoria sugerida.
 */
export const parseNaturalLanguageTransaction = (
  input: string,
  context: NlpParseContext
): ParsedNlpTransaction => {
  const rawInput = input.trim()
  const referenceDate = context.referenceDate ?? new Date()
  const accounts = context.accounts ?? []
  const creditCards = context.creditCards ?? []
  const categories = context.categories ?? []
  const existingTransactions = context.existingTransactions ?? []

  if (!rawInput) {
    return {
      rawInput: input,
      description: '',
      amount: null,
      type: 'expense',
      occurredAt: formatIsoDate(referenceDate),
      dateLabel: 'Hoje',
      isValidTransaction: false
    }
  }

  const dateExtracted = extractDate(rawInput, referenceDate)
  const amountExtracted = extractAmount(dateExtracted.remainingText)
  const type = detectType(rawInput)
  const paymentMatched = matchAccountOrCard(amountExtracted.remainingText, accounts, creditCards)
  const description = cleanDescription(paymentMatched.remainingText, type)

  const eligibleCategories = categories.filter((c) => c.type === type)
  const targetCategories = eligibleCategories.length > 0 ? eligibleCategories : categories

  const candidate: ParsedTransactionCandidate = {
    id: 'nlp-preview',
    date: dateExtracted.occurredAt,
    description,
    amount: amountExtracted.amount ?? 0,
    type,
    selected: true
  }

  const [categorized] = suggestLocalCategories([candidate], existingTransactions, targetCategories)

  return {
    rawInput: input,
    description,
    amount: amountExtracted.amount,
    type,
    occurredAt: dateExtracted.occurredAt,
    dateLabel: dateExtracted.dateLabel,
    accountId: paymentMatched.accountId,
    accountName: paymentMatched.accountName,
    creditCardId: paymentMatched.creditCardId,
    creditCardName: paymentMatched.creditCardName,
    categoryId: categorized?.categoryId ?? undefined,
    categoryName: categorized?.categoryName ?? undefined,
    isValidTransaction: amountExtracted.amount !== null && amountExtracted.amount > 0
  }
}
