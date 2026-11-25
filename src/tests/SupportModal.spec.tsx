import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SupportModal, buildLivePixUrl } from '../components/support/SupportModal'

describe('buildLivePixUrl', () => {
  it('deve montar URL padrão com fallback leozizz quando username e message forem omitidos', () => {
    expect(buildLivePixUrl(25)).toBe('https://livepix.gg/leozizz?amount=25')
  })

  it('deve aplicar encodeURIComponent em username e message e ignorar mensagens apenas com espaços', () => {
    expect(buildLivePixUrl(10, '   ', 'meu user')).toBe('https://livepix.gg/meu%20user?amount=10')
    expect(buildLivePixUrl(50, 'Valeu pelo Dinheirizz!', 'leozizz')).toBe(
      'https://livepix.gg/leozizz?amount=50&message=Valeu%20pelo%20Dinheirizz!'
    )
  })
})

describe('SupportModal', () => {
  const openSpy = vi.fn()

  beforeEach(() => {
    openSpy.mockReset()
    vi.stubGlobal('open', openSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(<SupportModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('deve renderizar com atributos de acessibilidade e presets com R$ 10 ativo por padrão', () => {
    render(<SupportModal isOpen onClose={vi.fn()} />)

    const dialog = screen.getByTestId('support-modal')
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'support-modal-title')

    expect(screen.getByRole('heading', { name: 'Apoiar o Dinheirizz' })).toBeInTheDocument()
    expect(screen.getByTestId('support-why-card')).toBeInTheDocument()

    const presets = [5, 10, 25, 50, 100]
    presets.forEach((amount) => {
      const btn = screen.getByTestId(`support-pix-preset-${amount}`)
      expect(btn).toHaveTextContent(`R$ ${amount}`)
      expect(btn).toHaveAttribute('aria-pressed', amount === 10 ? 'true' : 'false')
    })

    expect(screen.getByTestId('support-pix-amount-input')).toHaveValue('10')
  })

  it('deve atualizar o input numérico ao clicar em um preset e limpar erro anterior', () => {
    render(<SupportModal isOpen onClose={vi.fn()} />)

    const amountInput = screen.getByTestId('support-pix-amount-input')
    fireEvent.change(amountInput, { target: { value: '' } })
    fireEvent.submit(screen.getByTestId('support-pix-section'))

    expect(screen.getByTestId('support-pix-error')).toHaveAttribute('role', 'alert')

    fireEvent.click(screen.getByTestId('support-pix-preset-25'))
    expect(amountInput).toHaveValue('25')
    expect(screen.getByTestId('support-pix-preset-25')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('support-pix-error')).not.toBeInTheDocument()
  })

  it('deve bloquear teclas não numéricas e sanitizar dígitos no input customizado', () => {
    render(<SupportModal isOpen onClose={vi.fn()} />)

    const amountInput = screen.getByTestId('support-pix-amount-input')

    const blockedKeys = ['.', ',', '-', '+', 'e', 'E']
    blockedKeys.forEach((key) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      const prevented = !amountInput.dispatchEvent(event)
      expect(prevented).toBe(true)
    })

    fireEvent.change(amountInput, { target: { value: '42abc,9' } })
    expect(amountInput).toHaveValue('429')
  })

  it('deve exibir erro acessível e não chamar window.open quando valor for vazio ou 0', () => {
    render(<SupportModal isOpen onClose={vi.fn()} />)

    const amountInput = screen.getByTestId('support-pix-amount-input')
    const form = screen.getByTestId('support-pix-section')

    fireEvent.change(amountInput, { target: { value: '' } })
    fireEvent.submit(form)
    expect(screen.getByTestId('support-pix-error')).toHaveTextContent(
      'Informe um valor inteiro mínimo de R$ 1.'
    )
    expect(openSpy).not.toHaveBeenCalled()

    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.submit(form)
    expect(screen.getByTestId('support-pix-error')).toHaveAttribute('role', 'alert')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('deve abrir nova aba com buildLivePixUrl ao submeter valor válido e mensagem opcional', () => {
    render(<SupportModal isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId('support-pix-preset-50'))
    fireEvent.change(screen.getByTestId('support-pix-message-input'), {
      target: { value: 'Excelente app financeiro!' }
    })

    fireEvent.submit(screen.getByTestId('support-pix-section'))

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(openSpy).toHaveBeenCalledWith(
      'https://livepix.gg/leozizz?amount=50&message=Excelente%20app%20financeiro!',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('deve fechar ao pressionar Escape, clicar no botão fechar ou clicar no backdrop', () => {
    const onClose = vi.fn()
    render(<SupportModal isOpen onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('support-modal-close'))
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByTestId('support-modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
