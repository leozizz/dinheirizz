import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type {
  ExtractedReceiptData,
  CategorySummary,
  ParseReceiptResponse,
  ParseReceiptErrorResponse
} from '../types/aiReceipt'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Falha ao converter arquivo para base64.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'))
    reader.readAsDataURL(file)
  })

export const useReceiptOcr = () => {
  let token: string | undefined = undefined
  try {
    const auth = useAuth()
    token = auth?.session?.access_token
  } catch {
    // Ambiente de teste sem AuthProvider montado
    token = undefined
  }

  const [isScanning, setIsScanning] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ParseReceiptErrorResponse['code'] | null>(null)

  const resetScanState = useCallback(() => {
    setIsScanning(false)
    setExtractedData(null)
    setError(null)
    setErrorCode(null)
  }, [])

  const scanReceipt = useCallback(
    async (
      file: File,
      availableCategories: CategorySummary[] = []
    ): Promise<ExtractedReceiptData> => {
      setError(null)
      setErrorCode(null)

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        const errorMsg = 'Formato inválido. Envie imagem JPEG, PNG, WebP ou documento PDF.'
        setError(errorMsg)
        setErrorCode('UNSUPPORTED_MEDIA')
        throw new Error(errorMsg)
      }

      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = 'Arquivo muito grande. O limite máximo é de 10MB.'
        setError(errorMsg)
        setErrorCode('FILE_TOO_LARGE')
        throw new Error(errorMsg)
      }

      setIsScanning(true)

      try {
        const fileBase64 = await fileToBase64(file)

        const response = await fetch(`${getApiOrigin()}/api/v1/ai/parse-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            fileBase64,
            mimeType: file.type,
            filename: file.name,
            availableCategories
          })
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Partial<ParseReceiptErrorResponse>
          const resolvedCode = errorData.code || 'AI_SERVICE_ERROR'
          const resolvedMessage =
            errorData.message || errorData.error || 'Erro ao processar comprovante.'

          setErrorCode(resolvedCode)
          setError(resolvedMessage)
          throw new Error(resolvedMessage)
        }

        const json = (await response.json()) as ParseReceiptResponse
        setExtractedData(json.data)
        return json.data
      } finally {
        setIsScanning(false)
      }
    },
    [token]
  )

  return {
    isScanning,
    extractedData,
    error,
    errorCode,
    scanReceipt,
    resetScanState
  }
}
