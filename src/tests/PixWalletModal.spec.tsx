import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PixWalletModal } from '../components/modals/PixWalletModal'

const mockPixKeys = [
  {
    id: 'pix-1',
    key_type: 'email',
    key_value: 'leo@dinheirizz.com',
    bank_name: 'Nubank',
    description: 'Chave Principal'
  },
  {
    id: 'pix-2',
    key_type: 'cpf',
    key_value: '123.456.789-00',
    bank_name: 'Itaú',
    description: 'Chave CPF'
  }
]

describe('PixWalletModal (TDD)', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('deve renderizar título e chaves cadastradas quando isOpen for true', () => {
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Carteira Pix')).toBeInTheDocument()
    expect(screen.getByText(/selecione uma chave para receber pagamentos/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/leo@dinheirizz.com/i)).toBeInTheDocument()
  })

  it('não deve renderizar quando isOpen for false', () => {
    render(
      <PixWalletModal
        isOpen={false}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByText('Carteira Pix')).not.toBeInTheDocument()
  })

  it('deve permitir trocar de chave através do dropdown', () => {
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
      />
    )

    const select = screen.getByTestId('pix-key-select')
    fireEvent.change(select, { target: { value: 'pix-2' } })

    expect(screen.getByTestId('active-pix-key-value')).toHaveTextContent('123.456.789-00')
  })

  it('deve copiar a chave Pix para a área de transferência ao clicar em Copiar Chave', async () => {
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
      />
    )

    const copyBtn = screen.getByRole('button', { name: /copiar chave pix/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('leo@dinheirizz.com')
      expect(screen.getByText(/chave copiada/i)).toBeInTheDocument()
    })
  })

  it('deve disparar onClose ao clicar no botão fechar', () => {
    const handleClose = vi.fn()
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={handleClose}
      />
    )

    const closeBtn = screen.getByTestId('close-pix-modal-btn')
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('permite cadastrar uma nova chave Pix via formulário da aba Nova Chave', async () => {
    const handleCreate = vi.fn().mockResolvedValue(undefined)
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
        onCreatePixKey={handleCreate}
      />
    )

    // Clica na aba "+ Nova Chave"
    const newKeyTab = screen.getByRole('button', { name: /Nova Chave/i })
    fireEvent.click(newKeyTab)

    expect(screen.getByText('Cadastrar Nova Chave')).toBeInTheDocument()

    const keyInput = screen.getByPlaceholderText(/Digite sua chave Pix/i)
    fireEvent.change(keyInput, { target: { value: 'novo@email.com' } })

    const submitBtn = screen.getByRole('button', { name: /Salvar Chave/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          keyValue: 'novo@email.com'
        })
      )
    })
  })

  it('permite excluir uma chave Pix cadastrada', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <PixWalletModal
        isOpen={true}
        pixKeys={mockPixKeys}
        onClose={vi.fn()}
        onDeletePixKey={handleDelete}
      />
    )

    const deleteBtn = screen.getByTestId('delete-pix-key-pix-1')
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('pix-1')
    })
  })
})

