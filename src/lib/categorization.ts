import type { ParsedTransactionCandidate } from '../types/import'
import type { TransactionItem } from '../components/dashboard/Dashboard'
import type { CategoryItem } from '../hooks/useCategories'

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

interface KeywordRule {
  keywords: string[]
  categoryCategoryNames: string[]
}

const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: [
      'IFOOD',
      'RESTAURANTE',
      'PADARIA',
      'MERCADO',
      'SUPERMERCADO',
      'EXTRA',
      'CARREFOUR',
      'PAO DE ACUCAR',
      'LANCHONETE',
      'BURGER',
      'PIZZA',
      'CAFE',
      'CHURRASCARIA'
    ],
    categoryCategoryNames: ['ALIMENTACAO', 'ALIMENTAÇÃO', 'REFEICAO', 'REFEIÇÃO']
  },
  {
    keywords: [
      'UBER',
      '99APP',
      '99 POP',
      '99 TAXI',
      'POSTO',
      'SHELL',
      'IPIRANGA',
      'PETROBRAS',
      'GASOLINA',
      'COMBUSTIVEL',
      'ESTACIONAMENTO',
      'PEDAGIO',
      'SEM PARAR',
      'VELOE'
    ],
    categoryCategoryNames: ['TRANSPORTE', 'VEICULO', 'COMBUSTIVEL']
  },
  {
    keywords: [
      'DROGASIL',
      'RAIA',
      'DROGARIA',
      'FARMACIA',
      'FARMÁCIA',
      'PAGUE MENOS',
      'HOSPITAL',
      'LABORATORIO',
      'CONSULTORIO',
      'MEDICO',
      'DENTISTA',
      'EXAME'
    ],
    categoryCategoryNames: ['SAUDE', 'SAÚDE', 'FARMACIA', 'FARMÁCIA']
  },
  {
    keywords: [
      'NETFLIX',
      'SPOTIFY',
      'AMAZON PRIME',
      'YOUTUBE',
      'DISNEY',
      'HBO',
      'MAX',
      'APPLE',
      'GOOGLE',
      'CLARO',
      'VIVO',
      'TIM'
    ],
    categoryCategoryNames: ['ASSINATURAS & SERVICOS', 'SERVICOS', 'ASSINATURAS', 'LAZER']
  },
  {
    keywords: ['CONDOMINIO', 'ENEL', 'SABESP', 'CPFL', 'LUZ', 'AGUA', 'GAS', 'ALUGUEL', 'INTERNET'],
    categoryCategoryNames: ['MORADIA', 'CASA', 'CONTAS']
  },
  {
    keywords: ['SALARIO', 'SALÁRIO', 'PAGTO SALARIO', 'REMUNERACAO', 'FOLHA', 'TED SALARIO', 'VENCIMENTOS', 'PRO-LABORE'],
    categoryCategoryNames: ['SALARIO', 'SALÁRIO', 'RENDA']
  }
]

export const suggestLocalCategories = (
  candidates: ParsedTransactionCandidate[],
  existingTransactions: TransactionItem[],
  availableCategories: CategoryItem[]
): ParsedTransactionCandidate[] => {
  if (!candidates || candidates.length === 0) return []

  const normalizedCategories = availableCategories.map((c) => ({
    ...c,
    normalizedName: normalizeText(c.name)
  }))

  // Build historical lookup map from prior user transactions
  const historyLookup: { normalizedDesc: string; categoryId: string; categoryName: string }[] = []
  for (const tx of existingTransactions) {
    if (tx.description && (tx.categoryId || tx.category?.name)) {
      const catId = tx.categoryId || ''
      const catName = tx.category?.name || ''
      historyLookup.push({
        normalizedDesc: normalizeText(tx.description),
        categoryId: catId,
        categoryName: catName
      })
    }
  }

  return candidates.map((candidate) => {
    // If candidate already has category assigned, keep it
    if (candidate.categoryId) {
      return candidate
    }

    const normDesc = normalizeText(candidate.description)

    // 1. Check User Transaction History first (personalized historical precedence)
    for (const hist of historyLookup) {
      const histWords = hist.normalizedDesc.split(/\s+/).filter((w) => w.length >= 4)
      const candWords = normDesc.split(/\s+/).filter((w) => w.length >= 4)
      const commonWords = histWords.filter((w) => candWords.includes(w))

      if (
        normDesc.includes(hist.normalizedDesc) ||
        hist.normalizedDesc.includes(normDesc) ||
        commonWords.length >= 2 ||
        (commonWords.length === 1 && histWords.length <= 2)
      ) {
        const cat = normalizedCategories.find((c) => c.id === hist.categoryId || c.normalizedName === normalizeText(hist.categoryName))
        if (cat) {
          return {
            ...candidate,
            categoryId: cat.id,
            categoryName: cat.name,
            categorySource: 'history'
          }
        }
      }
    }

    // 2. Check Rule-based Keyword Dictionary
    for (const rule of DEFAULT_KEYWORD_RULES) {
      const keywordHit = rule.keywords.some((kw) => normDesc.includes(kw))
      if (keywordHit) {
        const matchedCategory = normalizedCategories.find((cat) =>
          rule.categoryCategoryNames.some((rcn) => cat.normalizedName.includes(rcn))
        )

        if (matchedCategory) {
          return {
            ...candidate,
            categoryId: matchedCategory.id,
            categoryName: matchedCategory.name,
            categorySource: 'rule'
          }
        }
      }
    }

    return candidate
  })
}
