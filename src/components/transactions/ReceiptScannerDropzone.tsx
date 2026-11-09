import React, { useRef, useState } from 'react'
import { Camera, Upload, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import type { ParseReceiptErrorResponse } from '../../types/aiReceipt'

export interface ReceiptScannerDropzoneProps {
  onFileSelected: (file: File) => void
  isScanning: boolean
  error: string | null
  errorCode: ParseReceiptErrorResponse['code'] | null
  onReset?: () => void
  onConfigureAiKey?: () => void
}

export const ReceiptScannerDropzone = ({
  onFileSelected,
  isScanning,
  error,
  errorCode,
  onReset,
  onConfigureAiKey
}: ReceiptScannerDropzoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      onFileSelected(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      onFileSelected(file)
      // Limpa para permitir selecionar o mesmo arquivo novamente se desejado
      e.target.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      data-testid="receipt-dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 p-4 sm:p-5 text-center ${
        isDragOver
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
          : 'border-dashed border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        data-testid="receipt-file-input"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={isScanning}
      />

      {isScanning ? (
        <div
          data-testid="receipt-scanning-indicator"
          aria-live="polite"
          className="flex flex-col items-center justify-center py-6 gap-3"
        >
          {/* Animação do Scanner Beam */}
          <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-bounce" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              Analisando comprovante com IA Multimodal...
            </p>
            <p className="text-xs text-white/60">
              Identificando valor, data, recebedor e categoria
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="receipt-ocr-upload-btn"
              onClick={triggerFileInput}
              className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary-foreground border border-primary/30 flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar Foto ou Anexar</span>
            </button>

            <button
              type="button"
              data-testid="receipt-ocr-drag-btn"
              onClick={triggerFileInput}
              className="min-h-[44px] min-w-[44px] px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center justify-center gap-1.5 text-sm transition-all cursor-pointer"
              title="Upload de arquivo"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>

          <p className="text-xs text-white/50">
            Arraste um cupom, recibo Pix ou fatura em PDF (até 10MB)
          </p>

          {error && (
            <div
              data-testid="receipt-scan-error"
              className="w-full mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2 text-left"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-medium text-rose-300">Falha na leitura</p>
                <p>{error}</p>
                {errorCode === 'AI_KEY_REQUIRED' && onConfigureAiKey && (
                  <button
                    type="button"
                    data-testid="prompt-configure-ai-key-btn"
                    onClick={onConfigureAiKey}
                    className="min-h-[44px] mt-2 inline-flex items-center text-xs text-amber-300 underline font-medium hover:text-amber-200 cursor-pointer"
                  >
                    Configurar chave gratuita de IA →
                  </button>
                )}
              </div>
              {onReset && (
                <button
                  type="button"
                  data-testid="receipt-reset-btn"
                  onClick={onReset}
                  className="min-h-[44px] min-w-[44px] p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Tentar novamente"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
