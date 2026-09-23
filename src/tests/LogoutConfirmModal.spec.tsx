import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LogoutConfirmModal } from '../components/modals/LogoutConfirmModal'

describe('LogoutConfirmModal Component (TDD)', () => {
  it('não deve renderizar nada quando isOpen={false}', () => {
    const { container } = render(
      <LogoutConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('deve renderizar título, mensagem explicativa e botões de ação quando isOpen={true}', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/deseja sair da sua conta\?/i)).toBeInTheDocument()
    expect(screen.getByText(/sua sessão será encerrada com segurança/i)).toBeInTheDocument()
    expect(screen.getByTestId('cancel-logout-btn')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-logout-btn')).toBeInTheDocument()
  })

  it('deve chamar onClose ao clicar no botão Cancelar ou no botão Fechar (X)', () => {
    const onClose = vi.fn()
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    )

    const cancelBtn = screen.getByTestId('cancel-logout-btn')
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('deve chamar onConfirm ao clicar no botão "Sim, Sair da Conta"', () => {
    const onConfirm = vi.fn()
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const confirmBtn = screen.getByTestId('confirm-logout-btn')
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('deve desabilitar botões quando isLoading={true}', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={true}
      />
    )

    expect(screen.getByTestId('cancel-logout-btn')).toBeDisabled()
    expect(screen.getByTestId('confirm-logout-btn')).toBeDisabled()
    expect(screen.getByRole('button', { name: /fechar/i })).toBeDisabled()
  })
})
