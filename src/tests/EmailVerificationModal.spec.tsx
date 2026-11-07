import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { EmailVerificationModal } from '../components/auth/EmailVerificationModal'

describe('EmailVerificationModal Component (TDD)', () => {
  const defaultProps = {
    isOpen: true,
    email: 'novo_usuario@dinheirizz.com',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onVerify: vi.fn().mockResolvedValue({ success: true, message: 'E-mail verificado com sucesso.' }),
    onResend: vi.fn().mockResolvedValue({ success: true, message: 'Novo código de verificação enviado para o seu e-mail.' })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('deve renderizar o modal com os elementos obrigatórios e data-testids', () => {
    render(<EmailVerificationModal {...defaultProps} />)

    expect(screen.getByTestId('email-verification-modal')).toBeInTheDocument()
    expect(screen.getByText(/Verifique seu E-mail/i)).toBeInTheDocument()
    expect(screen.getByText('novo_usuario@dinheirizz.com')).toBeInTheDocument()
    expect(screen.getByTestId('otp-input-field')).toBeInTheDocument()
    expect(screen.getByTestId('verify-otp-submit-btn')).toBeInTheDocument()
    expect(screen.getByTestId('resend-otp-btn')).toBeInTheDocument()
    expect(screen.getByTestId('resend-cooldown-timer')).toBeInTheDocument()
    expect(screen.getByTestId('close-verification-modal-btn')).toBeInTheDocument()
  })

  it('deve desabilitar o botão de submissão enquanto o código não tiver 6 dígitos', () => {
    render(<EmailVerificationModal {...defaultProps} />)

    const submitBtn = screen.getByTestId('verify-otp-submit-btn')
    const otpInput = screen.getByTestId('otp-input-field')

    // Inicialmente vazio
    expect(submitBtn).toBeDisabled()

    // 4 dígitos inseridos
    fireEvent.change(otpInput, { target: { value: '1234' } })
    expect(submitBtn).toBeDisabled()

    // 6 dígitos inseridos
    fireEvent.change(otpInput, { target: { value: '123456' } })
    expect(submitBtn).toBeEnabled()
  })

  it('deve submeter o código OTP com sucesso e chamar onSuccess', async () => {
    const onVerifyMock = vi.fn().mockResolvedValue({ success: true, message: 'E-mail verificado com sucesso.' })
    const onSuccessMock = vi.fn()

    render(
      <EmailVerificationModal
        {...defaultProps}
        onVerify={onVerifyMock}
        onSuccess={onSuccessMock}
      />
    )

    const otpInput = screen.getByTestId('otp-input-field')
    fireEvent.change(otpInput, { target: { value: '482915' } })

    const submitBtn = screen.getByTestId('verify-otp-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onVerifyMock).toHaveBeenCalledWith('novo_usuario@dinheirizz.com', '482915')
    })

    await waitFor(() => {
      expect(screen.getByTestId('verify-otp-success-alert')).toBeInTheDocument()
      expect(screen.getByText('E-mail verificado com sucesso.')).toBeInTheDocument()
    })

    await waitFor(
      () => {
        expect(onSuccessMock).toHaveBeenCalled()
      },
      { timeout: 2500 }
    )
  })

  it('deve exibir mensagem de erro quando o código informado for inválido ou expirado', async () => {
    const onVerifyMock = vi.fn().mockResolvedValue({
      success: false,
      message: 'Código de verificação inválido ou expirado.',
      error: 'Código de verificação inválido ou expirado.'
    })

    render(
      <EmailVerificationModal
        {...defaultProps}
        onVerify={onVerifyMock}
      />
    )

    const otpInput = screen.getByTestId('otp-input-field')
    fireEvent.change(otpInput, { target: { value: '000000' } })

    const submitBtn = screen.getByTestId('verify-otp-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByTestId('verify-otp-error-alert')).toBeInTheDocument()
      expect(screen.getByText('Código de verificação inválido ou expirado.')).toBeInTheDocument()
    })
  })

  it('deve controlar o cooldown de 60 segundos para reenvio do código', async () => {
    vi.useFakeTimers()
    const onResendMock = vi.fn().mockResolvedValue({
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail.'
    })

    render(
      <EmailVerificationModal
        {...defaultProps}
        onResend={onResendMock}
      />
    )

    const resendBtn = screen.getByTestId('resend-otp-btn')
    const timer = screen.getByTestId('resend-cooldown-timer')

    // Inicialmente bloqueado com 60 segundos
    expect(resendBtn).toBeDisabled()
    expect(timer).toHaveTextContent('60s')

    // Avança 30 segundos
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(timer).toHaveTextContent('30s')
    expect(resendBtn).toBeDisabled()

    // Avança os 30 segundos restantes (total 60s)
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(resendBtn).toBeEnabled()

    // Clica para reenviar
    await act(async () => {
      fireEvent.click(resendBtn)
    })

    expect(onResendMock).toHaveBeenCalledWith('novo_usuario@dinheirizz.com')

    // Deve reiniciar o cooldown para 60 segundos
    expect(resendBtn).toBeDisabled()
    expect(screen.getByTestId('resend-cooldown-timer')).toHaveTextContent('60s')

    vi.useRealTimers()
  })

  it('deve permitir fechar o modal através do botão de fechar', () => {
    const onCloseMock = vi.fn()
    render(<EmailVerificationModal {...defaultProps} onClose={onCloseMock} />)

    const closeBtn = screen.getByTestId('close-verification-modal-btn')
    fireEvent.click(closeBtn)

    expect(onCloseMock).toHaveBeenCalled()
  })
})
