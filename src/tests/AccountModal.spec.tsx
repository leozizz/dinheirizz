import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountModal } from '../components/modals/AccountModal'

describe('AccountModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<AccountModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.queryByText('Nova Conta')).not.toBeInTheDocument()
  })

  it('renders form inputs when isOpen is true', () => {
    render(<AccountModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByText('Nova Conta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ex: Nubank Principal/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/0,00/i)).toBeInTheDocument()
  })

  it('submits valid data when form is filled', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(<AccountModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />)

    const nameInput = screen.getByPlaceholderText(/Ex: Nubank Principal/i)
    fireEvent.change(nameInput, { target: { value: 'Inter Invest' } })

    const balanceInput = screen.getByPlaceholderText(/0,00/i)
    fireEvent.change(balanceInput, { target: { value: '250.50' } })

    const submitBtn = screen.getByRole('button', { name: /Salvar Conta/i })
    fireEvent.submit(submitBtn.closest('form')!)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Inter Invest',
          balance: 250.5
        })
      )
    })
  })

  it('closes when clicking the close button', () => {
    const handleClose = vi.fn()
    render(<AccountModal isOpen={true} onClose={handleClose} onSubmit={vi.fn()} />)

    const closeBtn = screen.getByLabelText(/Fechar modal/i)
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalled()
  })

  it('exibe badge da instituição detectada ao digitar o nome ou banco', () => {
    render(<AccountModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

    const bankInput = screen.getByPlaceholderText(/Ex: Nubank, Inter, Itaú/i)
    fireEvent.change(bankInput, { target: { value: 'Nubank' } })

    expect(screen.getByText(/Instituição identificada:/i)).toBeInTheDocument()
    expect(screen.getByText('Nubank')).toBeInTheDocument()
  })
})

