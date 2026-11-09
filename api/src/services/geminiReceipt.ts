import type {
  CategorySummary,
  ExtractedReceiptData,
  ReceiptPaymentType
} from '../../../src/types/aiReceipt'

export class ReceiptOcrError extends Error {
  readonly code: 'RECEIPT_UNREADABLE' | 'AI_SERVICE_ERROR' | 'UNSUPPORTED_MEDIA' | 'FILE_TOO_LARGE'

  constructor(
    message: string,
    code: 'RECEIPT_UNREADABLE' | 'AI_SERVICE_ERROR' | 'UNSUPPORTED_MEDIA' | 'FILE_TOO_LARGE' = 'RECEIPT_UNREADABLE'
  ) {
    super(message)
    this.name = 'ReceiptOcrError'
    this.code = code
  }
}

export interface GeminiReceiptOptions {
  fileBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | string
  apiKey: string
  modelName?: string
  availableCategories?: CategorySummary[]
}

const cleanBase64 = (data: string): string => {
  const match = data.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/)
  return match ? match[2] : data
}

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const findBestCategoryMatch = (
  suggestedName: string | undefined,
  categories: CategorySummary[],
  baseConfidence = 0.9
): { id?: string; name: string; confidence: number } | null => {
  if (!suggestedName || categories.length === 0) return null

  const normalizedSuggestion = normalizeText(suggestedName)

  // 1. Busca exata (ignorando acentos e case)
  const exactMatch = categories.find(
    (c) => normalizeText(c.name) === normalizedSuggestion
  )
  if (exactMatch) {
    return { id: exactMatch.id, name: exactMatch.name, confidence: Math.max(baseConfidence, 0.95) }
  }

  // 2. Busca por inclusão parcial
  const partialMatch = categories.find(
    (c) =>
      normalizeText(c.name).includes(normalizedSuggestion) ||
      normalizedSuggestion.includes(normalizeText(c.name))
  )
  if (partialMatch) {
    return { id: partialMatch.id, name: partialMatch.name, confidence: Math.min(baseConfidence, 0.85) }
  }

  return { name: suggestedName, confidence: Math.min(baseConfidence, 0.6) }
}

const buildReceiptPrompt = (availableCategories: CategorySummary[]): string => {
  const categoriesList = availableCategories.length > 0
    ? `\nCategorias cadastradas do usuário:\n${availableCategories.map((c) => `- ${c.name} (${c.type})`).join('\n')}`
    : ''

  return `Você é um assistente especialista fiscal e contábil brasileiro do Dinheirizz.
Analise a imagem ou documento PDF fornecido (cupom fiscal NFC-e, recibo SAT, comprovante de transferência PIX, comprovante de cartão de crédito/débito, boleto ou recibo manual).

Extraia os dados estruturados com alta precisão e responda EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown ou textos adicionais fora do JSON):

{
  "amount": number (valor monetário em reais, positivo, ex: 84.50),
  "occurredAt": string (data da transação no formato YYYY-MM-DD, ex: 2026-11-08; se não encontrar a data, retorne null),
  "description": string (nome do estabelecimento, recebedor do Pix ou motivo da despesa limpo de ruídos tributários, ex: "Supermercado Pão de Açúcar"),
  "paymentType": "pix" | "credit" | "debit" | "boleto" | "cash" | "other",
  "type": "expense" | "income" (geralmente "expense", a menos que seja um comprovante de recebimento),
  "suggestedCategoryName": string (categoria mais adequada com base no tipo de estabelecimento),
  "confidence": number (entre 0.0 e 1.0 indicando a certeza da leitura),
  "notes": string (informação adicional relevante, ex: número de itens ou descrição sucinta)
}

Se a imagem NÃO for um comprovante financeiro, estiver completamente ilegível, escura, borrada ou sem caracteres úteis para identificar valor e estabelecimento, retorne exatamente:
{
  "error": "UNREADABLE_OR_NOT_FINANCIAL",
  "reason": "Descrição sucinta do porquê o documento não pôde ser lido"
}
${categoriesList}`
}

export const parseReceiptWithGemini = async (
  options: GeminiReceiptOptions
): Promise<ExtractedReceiptData> => {
  const {
    fileBase64,
    mimeType,
    apiKey,
    modelName = 'gemini-1.5-flash',
    availableCategories = []
  } = options

  const pureBase64 = cleanBase64(fileBase64)
  const prompt = buildReceiptPrompt(availableCategories)

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: pureBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na comunicação de rede com Gemini'
    throw new ReceiptOcrError(`Falha de conexão com a IA: ${errorMsg}`, 'AI_SERVICE_ERROR')
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new ReceiptOcrError(
      `Erro na resposta da API Gemini (${response.status}): ${errorBody}`,
      'AI_SERVICE_ERROR'
    )
  }

  const jsonResponse = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const rawCandidateText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawCandidateText) {
    throw new ReceiptOcrError(
      'Não foi possível extrair dados do comprovante. Nenhuma resposta do modelo.',
      'RECEIPT_UNREADABLE'
    )
  }

  const sanitizedText = rawCandidateText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  interface ParsedModelJson {
    error?: string
    reason?: string
    amount?: number | string
    occurredAt?: string | null
    description?: string
    paymentType?: string
    type?: string
    suggestedCategoryName?: string
    confidence?: number
    notes?: string
  }

  let parsed: ParsedModelJson
  try {
    parsed = JSON.parse(sanitizedText) as ParsedModelJson
  } catch {
    throw new ReceiptOcrError(
      'Não foi possível interpretar a resposta estruturada da IA.',
      'RECEIPT_UNREADABLE'
    )
  }

  if (parsed.error === 'UNREADABLE_OR_NOT_FINANCIAL') {
    throw new ReceiptOcrError(
      parsed.reason || 'Não foi possível identificar dados financeiros no comprovante. Verifique a nitidez ou iluminação da imagem.',
      'RECEIPT_UNREADABLE'
    )
  }

  const rawAmount = typeof parsed.amount === 'string' ? parseFloat(parsed.amount.replace(',', '.')) : parsed.amount
  if (typeof rawAmount !== 'number' || isNaN(rawAmount) || rawAmount <= 0) {
    throw new ReceiptOcrError(
      'O valor financeiro não pôde ser identificado no documento.',
      'RECEIPT_UNREADABLE'
    )
  }

  const todayStr = new Date().toISOString().split('T')[0]
  let occurredAt = todayStr
  if (parsed.occurredAt && /^\d{4}-\d{2}-\d{2}$/.test(parsed.occurredAt)) {
    occurredAt = parsed.occurredAt
  }

  const validPaymentTypes: ReceiptPaymentType[] = ['pix', 'credit', 'debit', 'boleto', 'cash', 'other']
  const paymentType: ReceiptPaymentType = validPaymentTypes.includes(
    parsed.paymentType as ReceiptPaymentType
  )
    ? (parsed.paymentType as ReceiptPaymentType)
    : 'other'

  const type = parsed.type === 'income' ? 'income' : 'expense'
  const description = (parsed.description || 'Despesa sem identificação').slice(0, 255)
  const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85

  const categorySuggestion = findBestCategoryMatch(
    parsed.suggestedCategoryName,
    availableCategories,
    confidence
  )

  return {
    amount: rawAmount,
    occurredAt,
    description,
    paymentType,
    type,
    categorySuggestion,
    confidence,
    notes: parsed.notes
  }
}
