import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DangerConfirmModal } from '../components/modals/DangerConfirmModal'

describe('DangerConfirmModal Component (TDD - Dupla Confirmação Destrutiva)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Excluir Todas as Transações',
    description: 'Todas as receitas e despesas serão permanentemente excluídas.',
    expectedPhrase: 'apagar todas as minhas transações',
    onConfirm: vi.fn()
  }

  it('não deve renderizar quando isOpen={false}', () => {
    const { container } = render(
      <DangerConfirmModal {...defaultProps} isOpen={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('deve renderizar modal com título, advertência e botão desabilitado inicialmente', () => {
    render(<DangerConfirmModal {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Excluir Todas as Transações')).toBeInTheDocument()
    expect(screen.getByText(/todas as receitas e despesas serão permanentemente excluídas/i)).toBeInTheDocument()
    expect(screen.getByText('apagar todas as minhas transações')).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /entendo os riscos, apagar dados/i })
    expect(submitBtn).toBeDisabled()
  })

  it('deve manter o botão desabilitado enquanto a frase digitada estiver incompleta ou incorreta', () => {
    render(<DangerConfirmModal {...defaultProps} />)

    const input = screen.getByRole('textbox')
    const submitBtn = screen.getByRole('button', { name: /entendo os riscos, apagar dados/i })

    fireEvent.change(input, { target: { value: 'apagar' } })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'apagar todas as contas' } })
    expect(submitBtn).toBeDisabled()
  })

  it('deve habilitar o botão assim que a frase correta for digitada (case-insensitive com trim)', () => {
    render(<DangerConfirmModal {...defaultProps} />)

    const input = screen.getByRole('textbox')
    const submitBtn = screen.getByRole('button', { name: /entendo os riscos, apagar dados/i })

    fireEvent.change(input, { target: { value: '  APAGAR TODAS AS MINHAS TRANSAÇÕES  ' } })
    expect(submitBtn).not.toBeDisabled()
  })

  it('deve executar onConfirm e fechar modal ao submeter a frase correta', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined)
    const onCloseMock = vi.fn()

    render(
      <DangerConfirmModal
        {...defaultProps}
        onConfirm={onConfirmMock}
        onClose={onCloseMock}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'apagar todas as minhas transações' } })

    const submitBtn = screen.getByRole('button', { name: /entendo os riscos, apagar dados/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onConfirmMock).toHaveBeenCalledTimes(1)
      expect(onCloseMock).toHaveBeenCalledTimes(1)
    })
  })

  it('deve chamar onClose ao clicar em Cancelar ou no botão Fechar (X)', () => {
    const onCloseMock = vi.fn()
    render(<DangerConfirmModal {...defaultProps} onClose={onCloseMock} />)

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i })
    fireEvent.click(cancelBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(2)
  })
})
