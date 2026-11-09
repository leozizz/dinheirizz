export type ReceiptPaymentType = 'pix' | 'credit' | 'debit' | 'boleto' | 'cash' | 'other'

export interface CategorySummary {
  id: string
  name: string
  type: 'income' | 'expense'
}

export interface ParseReceiptPayload {
  fileBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
  filename?: string
  availableCategories?: CategorySummary[]
}

export interface ExtractedReceiptData {
  amount: number
  occurredAt: string // Formato YYYY-MM-DD
  description: string
  paymentType: ReceiptPaymentType
  type: 'expense' | 'income'
  categorySuggestion: {
    id?: string
    name: string
    confidence: number
  } | null
  confidence: number
  notes?: string
}

export interface ParseReceiptResponse {
  success: boolean
  data: ExtractedReceiptData
  source: 'byok' | 'system' | 'mock'
  provider: string
  modelName: string
}

export interface ParseReceiptErrorResponse {
  error: string
  code: 'AI_KEY_REQUIRED' | 'RECEIPT_UNREADABLE' | 'UNSUPPORTED_MEDIA' | 'FILE_TOO_LARGE' | 'AI_SERVICE_ERROR'
  message: string
  details?: unknown
}
