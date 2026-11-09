import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { TransactionModal } from '../components/modals/TransactionModal'
import { ReceiptScannerDropzone } from '../components/transactions/ReceiptScannerDropzone'
import { AiKeyPromptModal } from '../components/modals/AiKeyPromptModal'
import { QuickActions } from '../components/dashboard/QuickActions'
import * as useReceiptOcrModule from '../hooks/useReceiptOcr'
import type { CategoryOption, AccountOption } from '../components/modals/TransactionModal'

describe('QA & A11y Suite — Leitura e Registro Automático de Comprovantes via IA Multimodal (#33)', () => {
  const sampleCategories: CategoryOption[] = [
    { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense' },
    { id: 'cat-transporte', name: 'Transporte', type: 'expense' },
    { id: 'cat-salario', name: 'Salário', type: 'income' }
  ]

  const sampleAccounts: AccountOption[] = [
    { id: 'acc-nubank', name: 'Nubank Principal', balance: 4500 },
    { id: 'acc-inter', name: 'Banco Inter', balance: 2300 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Auditoria de Acessibilidade (A11y) & Touch Targets (WCAG 2.1 AA)', () => {
    it('deve garantir que todos os botões do ReceiptScannerDropzone possuam touch target mínimo de 44x44px', () => {
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={false}
          error={null}
          errorCode={null}
          onReset={vi.fn()}
          onConfigureAiKey={vi.fn()}
        />
      )

      const uploadBtn = screen.getByTestId('receipt-ocr-upload-btn')
      expect(uploadBtn.className).toMatch(/min-h-\[44px\]/)
      expect(uploadBtn.className).toMatch(/min-w-\[44px\]/)

      const dragBtn = screen.getByTestId('receipt-ocr-drag-btn')
      expect(dragBtn.className).toMatch(/min-h-\[44px\]/)
      expect(dragBtn.className).toMatch(/min-w-\[44px\]/)
    })

    it('deve garantir touch targets mínimos de 44x44px nos botões de erro e retry da dropzone', () => {
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={false}
          error="Comprovante ilegível"
          errorCode="RECEIPT_UNREADABLE"
          onReset={vi.fn()}
          onConfigureAiKey={vi.fn()}
        />
      )

      const resetBtn = screen.getByTestId('receipt-reset-btn')
      expect(resetBtn.className).toMatch(/min-h-\[44px\]/)
      expect(resetBtn.className).toMatch(/min-w-\[44px\]/)
    })

    it('deve garantir touch target mínimo de 44px no link de configuração de chave de IA', () => {
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={false}
          error="Chave de IA necessária"
          errorCode="AI_KEY_REQUIRED"
          onReset={vi.fn()}
          onConfigureAiKey={vi.fn()}
        />
      )

      const configureBtn = screen.getByTestId('prompt-configure-ai-key-btn')
      expect(configureBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve garantir que o leitor de tela anuncie o progresso do OCR com aria-live no indicator', () => {
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={true}
          error={null}
          errorCode={null}
        />
      )

      const indicator = screen.getByTestId('receipt-scanning-indicator')
      expect(indicator).toHaveAttribute('aria-live', 'polite')
      expect(indicator).toHaveTextContent(/Analisando comprovante com IA Multimodal/i)
    })

    it('deve garantir atributos ARIA e touch targets mínimos de 44x44px no AiKeyPromptModal', () => {
      render(
        <AiKeyPromptModal
          isOpen={true}
          onClose={vi.fn()}
          onConfigureKey={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'ai-key-modal-title')

      const closeBtn = screen.getByTestId('close-ai-key-modal-btn')
      expect(closeBtn).toHaveAttribute('aria-label', 'Fechar modal')
      expect(closeBtn.className).toMatch(/min-h-\[44px\]/)
      expect(closeBtn.className).toMatch(/min-w-\[44px\]/)

      const configureKeyBtn = screen.getByTestId('open-ai-settings-btn')
      expect(configureKeyBtn.className).toMatch(/min-h-\[44px\]/)

      const closePromptBtn = screen.getByTestId('close-ai-prompt-btn')
      expect(closePromptBtn.className).toMatch(/min-h-\[44px\]/)
    })

    it('deve garantir touch target mínimo de 44px no botão disparador de OCR no TransactionModal', () => {
      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          categories={sampleCategories}
          accounts={sampleAccounts}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      )

      const triggerBtn = screen.getByTestId('trigger-receipt-ocr-btn')
      expect(triggerBtn.className).toMatch(/min-h-\[44px\]/)
    })
  })

  describe('Auditoria de data-testid para Automação', () => {
    it('deve conter data-testid em todos os elementos de interação do fluxo de escaneamento', () => {
      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          categories={sampleCategories}
          accounts={sampleAccounts}
          initialOpenOcr={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      )

      expect(screen.getByTestId('trigger-receipt-ocr-btn')).toBeInTheDocument()
      expect(screen.getByTestId('receipt-dropzone')).toBeInTheDocument()
      expect(screen.getByTestId('receipt-file-input')).toBeInTheDocument()
      expect(screen.getByTestId('receipt-ocr-upload-btn')).toBeInTheDocument()
      expect(screen.getByTestId('receipt-ocr-drag-btn')).toBeInTheDocument()
    })

    it('deve renderizar data-testid="quick-scan-receipt-btn" no QuickActions', () => {
      render(<QuickActions onAction={vi.fn()} />)

      const scanActionBtn = screen.getByTestId('quick-scan-receipt-btn')
      expect(scanActionBtn).toBeInTheDocument()
      expect(scanActionBtn).toHaveTextContent(/Escanear/i)
      expect(scanActionBtn).toHaveTextContent(/Comprovante IA/i)
    })
  })

  describe('Validação de Cenários de Borda e Tratamento de Erros da IA', () => {
    it('deve gerenciar estado de arrastar e soltar (drag & drop) visualmente na dropzone', () => {
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={false}
          error={null}
          errorCode={null}
        />
      )

      const dropzone = screen.getByTestId('receipt-dropzone')
      expect(dropzone.className).toMatch(/border-dashed/)

      // Simula drag over
      fireEvent.dragOver(dropzone, { dataTransfer: { files: [] } })
      expect(dropzone.className).toMatch(/border-primary/)

      // Simula drag leave
      fireEvent.dragLeave(dropzone)
      expect(dropzone.className).toMatch(/border-dashed/)
    })

    it('deve disparar onFileSelected ao soltar arquivo no dropzone', () => {
      const handleFileSelected = vi.fn()
      render(
        <ReceiptScannerDropzone
          onFileSelected={handleFileSelected}
          isScanning={false}
          error={null}
          errorCode={null}
        />
      )

      const dropzone = screen.getByTestId('receipt-dropzone')
      const testFile = new File(['pix-receipt'], 'comprovante-pix.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [testFile] }
      })

      expect(handleFileSelected).toHaveBeenCalledTimes(1)
      expect(handleFileSelected).toHaveBeenCalledWith(testFile)
    })

    it('deve abrir o AiKeyPromptModal quando o erro retornado for AI_KEY_REQUIRED e o usuário clicar no botão', () => {
      const handleOpenAiKey = vi.fn()
      render(
        <ReceiptScannerDropzone
          onFileSelected={vi.fn()}
          isScanning={false}
          error="Chave de API do Gemini não configurada."
          errorCode="AI_KEY_REQUIRED"
          onConfigureAiKey={handleOpenAiKey}
        />
      )

      const configBtn = screen.getByTestId('prompt-configure-ai-key-btn')
      fireEvent.click(configBtn)

      expect(handleOpenAiKey).toHaveBeenCalledTimes(1)
    })

    it('deve permitir fechar e acionar configuração a partir do AiKeyPromptModal', () => {
      const handleClose = vi.fn()
      const handleConfigureKey = vi.fn()

      render(
        <AiKeyPromptModal
          isOpen={true}
          onClose={handleClose}
          onConfigureKey={handleConfigureKey}
        />
      )

      const configBtn = screen.getByTestId('open-ai-settings-btn')
      fireEvent.click(configBtn)

      expect(handleClose).toHaveBeenCalledTimes(1)
      expect(handleConfigureKey).toHaveBeenCalledTimes(1)
    })

    it('deve exibir badge de extração via IA com botão para descartar no TransactionModal', async () => {
      const mockScanReceipt = vi.fn().mockResolvedValue({
        amount: 154.20,
        occurredAt: '2026-11-09',
        description: 'Posto Shell Combustíveis',
        paymentType: 'debit',
        type: 'expense',
        categorySuggestion: { id: 'cat-transporte', name: 'Transporte', confidence: 0.98 },
        confidence: 0.98
      })

      vi.spyOn(useReceiptOcrModule, 'useReceiptOcr').mockReturnValue({
        isScanning: false,
        extractedData: null,
        error: null,
        errorCode: null,
        scanReceipt: mockScanReceipt,
        resetScanState: vi.fn()
      })

      render(
        <TransactionModal
          isOpen={true}
          mode="expense"
          categories={sampleCategories}
          accounts={sampleAccounts}
          initialOpenOcr={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      )

      const fileInput = screen.getByTestId('receipt-file-input')
      const file = new File(['mock-image-data'], 'cupom-fiscal.png', { type: 'image/png' })
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('ai-extracted-badge')).toBeInTheDocument()
      })

      const badge = screen.getByTestId('ai-extracted-badge')
      expect(badge).toHaveTextContent(/Extraído via IA/i)
      expect(badge).toHaveTextContent(/98% precisão/i)

      // Clicar em descartar badge
      const discardBtn = screen.getByRole('button', { name: /Descartar/i })
      fireEvent.click(discardBtn)

      expect(screen.queryByTestId('ai-extracted-badge')).not.toBeInTheDocument()
    })
  })

  describe('Auditoria de Responsividade Mobile/Desktop & Ausência de Overflow', () => {
    it('deve aplicar grid responsivo no QuickActions adaptável a telas mobile, tablet e desktop', () => {
      const { container } = render(<QuickActions onAction={vi.fn()} />)

      const gridContainer = container.firstElementChild
      expect(gridContainer?.className).toMatch(/grid-cols-2/)
      expect(gridContainer?.className).toMatch(/sm:grid-cols-3/)
      expect(gridContainer?.className).toMatch(/lg:grid-cols-6/)
    })

    it('deve conter estilos fluidos de largura máxima e margem para prevenir overflow horizontal no modal de IA', () => {
      render(
        <AiKeyPromptModal
          isOpen={true}
          onClose={vi.fn()}
          onConfigureKey={vi.fn()}
        />
      )

      const modalContainer = screen.getByRole('dialog')
      const card = modalContainer.firstElementChild

      expect(card?.className).toMatch(/max-w-md/)
      expect(card?.className).toMatch(/w-full/)
    })
  })
})
