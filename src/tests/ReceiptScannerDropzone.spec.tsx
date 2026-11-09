import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ReceiptScannerDropzone } from '../components/transactions/ReceiptScannerDropzone'
import { AiKeyPromptModal } from '../components/modals/AiKeyPromptModal'

describe('ReceiptScannerDropzone Component (TDD)', () => {
  it('deve renderizar a área de dropzone com input de arquivo e atributos de acessibilidade', () => {
    const onFileSelected = vi.fn()

    render(
      <ReceiptScannerDropzone
        onFileSelected={onFileSelected}
        isScanning={false}
        error={null}
        errorCode={null}
      />
    )

    const dropzone = screen.getByTestId('receipt-dropzone')
    expect(dropzone).toBeInTheDocument()

    const fileInput = screen.getByTestId('receipt-file-input')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,application/pdf'
    )
    expect(fileInput).toHaveAttribute('capture', 'environment')

    const uploadBtn = screen.getByTestId('receipt-ocr-upload-btn')
    expect(uploadBtn).toBeInTheDocument()
    // Touch target mínimo 44x44px verificado via classes (min-h-[44px] ou h-11 / p-3)
    expect(uploadBtn.className).toContain('min-h-[44px]')
  })

  it('deve chamar onFileSelected quando o usuário seleciona um arquivo no input', () => {
    const onFileSelected = vi.fn()

    render(
      <ReceiptScannerDropzone
        onFileSelected={onFileSelected}
        isScanning={false}
        error={null}
        errorCode={null}
      />
    )

    const fileInput = screen.getByTestId('receipt-file-input')
    const file = new File(['conteudo-imagem'], 'cupom.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(onFileSelected).toHaveBeenCalledWith(file)
  })

  it('deve exibir animação de escaneamento e aria-live="polite" durante isScanning={true}', () => {
    render(
      <ReceiptScannerDropzone
        onFileSelected={vi.fn()}
        isScanning={true}
        error={null}
        errorCode={null}
      />
    )

    const scanningIndicator = screen.getByTestId('receipt-scanning-indicator')
    expect(scanningIndicator).toBeInTheDocument()
    expect(scanningIndicator).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/Analisando comprovante com IA Multimodal/i)).toBeInTheDocument()
  })

  it('deve exibir mensagem de erro quando fornecida', () => {
    render(
      <ReceiptScannerDropzone
        onFileSelected={vi.fn()}
        isScanning={false}
        error="Não foi possível identificar dados financeiros no comprovante."
        errorCode="RECEIPT_UNREADABLE"
      />
    )

    const errorBox = screen.getByTestId('receipt-scan-error')
    expect(errorBox).toBeInTheDocument()
    expect(errorBox).toHaveTextContent(/Não foi possível identificar dados financeiros/i)
  })
})

describe('AiKeyPromptModal Component (TDD)', () => {
  it('deve renderizar modal de orientação quando isOpen={true}', () => {
    const onConfigureKey = vi.fn()
    const onClose = vi.fn()

    render(
      <AiKeyPromptModal
        isOpen={true}
        onClose={onClose}
        onConfigureKey={onConfigureKey}
      />
    )

    expect(screen.getByTestId('ai-key-prompt-modal')).toBeInTheDocument()
    expect(screen.getByText(/Chave de IA Necessária/i)).toBeInTheDocument()

    const configBtn = screen.getByTestId('open-ai-settings-btn')
    expect(configBtn).toBeInTheDocument()
    fireEvent.click(configBtn)
    expect(onConfigureKey).toHaveBeenCalledTimes(1)
  })
})
