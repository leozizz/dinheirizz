import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SupportButton } from '../components/support/SupportButton'

describe('SupportButton', () => {
  it('deve renderizar botão com texto "Apoiar com Pix" e data-testid="support-floating-button"', () => {
    render(<SupportButton />)

    const button = screen.getByTestId('support-floating-button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Apoiar com Pix')
    expect(button).toHaveAttribute('aria-label', 'Apoiar o projeto Dinheirizz')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('não deve renderizar nada quando enablePix for false', () => {
    const { container } = render(<SupportButton enablePix={false} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('support-floating-button')).not.toBeInTheDocument()
  })

  it('deve abrir o SupportModal ao clicar no botão e atualizar aria-expanded para true', () => {
    render(<SupportButton />)

    const button = screen.getByTestId('support-floating-button')
    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('support-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('support-modal-close'))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('support-modal')).not.toBeInTheDocument()
  })

  it('deve abrir o SupportModal ao disparar o evento customizado dinheirizz:open-support no window', () => {
    render(<SupportButton />)

    expect(screen.queryByTestId('support-modal')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new CustomEvent('dinheirizz:open-support'))
    })

    expect(screen.getByTestId('support-modal')).toBeInTheDocument()
    expect(screen.getByTestId('support-floating-button')).toHaveAttribute('aria-expanded', 'true')
  })
})
