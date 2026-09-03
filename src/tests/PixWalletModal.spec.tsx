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
})
