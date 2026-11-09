import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { TransactionModal } from '../components/modals/TransactionModal'
import { QuickActions } from '../components/dashboard/QuickActions'
import * as useReceiptOcrModule from '../hooks/useReceiptOcr'

const mockCategories = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Transporte', type: 'expense' },
  { id: 'cat-3', name: 'Salário', type: 'income' }
]

const mockAccounts = [
  { id: 'acc-1', name: 'Nubank Principal', balance: 5000 },
  { id: 'acc-2', name: 'Itaú Reserva', balance: 12000 }
]

describe('Receipt OCR Integration in TransactionModal & QuickActions (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve renderizar botão para acionar OCR no cabeçalho do TransactionModal', () => {
    render(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const triggerBtn = screen.getByTestId('trigger-receipt-ocr-btn')
    expect(triggerBtn).toBeInTheDocument()
    expect(triggerBtn).toHaveTextContent(/Ler Comprovante/i)
  })

  it('deve abrir a dropzone de OCR ao clicar no botão de acionamento', () => {
    render(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.queryByTestId('receipt-dropzone')).not.toBeInTheDocument()

    const triggerBtn = screen.getByTestId('trigger-receipt-ocr-btn')
    fireEvent.click(triggerBtn)

    expect(screen.getByTestId('receipt-dropzone')).toBeInTheDocument()
  })

  it('deve preencher automaticamente valor, descrição, data e categoria após leitura bem-sucedida', async () => {
    const mockScanReceipt = vi.fn().mockResolvedValue({
      amount: 84.5,
      occurredAt: '2026-11-08',
      description: 'Supermercado Pão de Açúcar',
      paymentType: 'pix',
      type: 'expense',
      categorySuggestion: { id: 'cat-1', name: 'Alimentação', confidence: 0.95 },
      confidence: 0.95
    })

    vi.spyOn(useReceiptOcrModule, 'useReceiptOcr').mockReturnValue({
      isScanning: false,
      extractedData: null,
      error: null,
      errorCode: null,
      scanReceipt: mockScanReceipt,
      resetScanState: vi.fn()
    })

    const handleSubmit = vi.fn()

    render(
      <TransactionModal
        isOpen={true}
        mode="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    // Abre o OCR dropzone
    fireEvent.click(screen.getByTestId('trigger-receipt-ocr-btn'))

    // Seleciona um arquivo
    const fileInput = screen.getByTestId('receipt-file-input')
    const file = new File(['mock-img'], 'cupom.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockScanReceipt).toHaveBeenCalledWith(file, expect.any(Array))
    })

    // Verifica se os campos foram preenchidos
    await waitFor(() => {
      expect(screen.getByDisplayValue('84,50')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Supermercado Pão de Açúcar')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2026-11-08')).toBeInTheDocument()
      expect(screen.getByTestId('ai-extracted-badge')).toBeInTheDocument()
    })

    // Submete o formulário
    fireEvent.click(screen.getByTestId('transaction-submit-btn'))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 84.5,
          description: 'Supermercado Pão de Açúcar',
          occurredAt: '2026-11-08',
          categoryId: 'cat-1'
        })
      )
    })
  })

  it('deve conter atalho de leitura de comprovante nas QuickActions', () => {
    const handleAction = vi.fn()
    render(<QuickActions onAction={handleAction} />)

    const scanBtn = screen.getByTestId('quick-scan-receipt-btn')
    expect(scanBtn).toBeInTheDocument()
    fireEvent.click(scanBtn)
    expect(handleAction).toHaveBeenCalledWith('scan')
  })
})
