import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileModal } from '../components/modals/ProfileModal'

const mockMutateAsync = vi.fn()

const mockProfile = {
  id: 'user-1',
  email: 'leonardo@dinheirizz.com',
  fullName: 'Leonardo Silva',
  username: 'leozizz',
  avatarUrl: null,
  provider: 'email',
  providers: ['email']
}

const mockAuthUser = {
  id: 'user-1',
  email: 'leonardo@dinheirizz.com',
  fullName: 'Leonardo Silva',
  username: 'leozizz'
}

vi.mock('../hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: mockProfile,
    isLoading: false
  }),
  useUpdateProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false
  })
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    updateUser: vi.fn()
  })
}))

describe('ProfileModal Component (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não deve renderizar nada quando isOpen={false}', () => {
    const { container } = render(
      <ProfileModal
        isOpen={false}
        onClose={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('deve renderizar dados cadastrais (email, nome e username) quando isOpen={true}', () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('leonardo@dinheirizz.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Leonardo Silva')).toBeInTheDocument()
    expect(screen.getByDisplayValue('leozizz')).toBeInTheDocument()
    expect(screen.getByText(/verificado/i)).toBeInTheDocument()
  })

  it('deve submeter o formulário chamando a mutação de atualização', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 'user-1',
      email: 'leonardo@dinheirizz.com',
      fullName: 'Leonardo Silva Novo',
      username: 'leozizz_pro'
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const nameInput = screen.getByLabelText(/nome completo/i)
    fireEvent.change(nameInput, { target: { value: 'Leonardo Silva Novo' } })

    const usernameInput = screen.getByLabelText(/nome de usuário/i)
    fireEvent.change(usernameInput, { target: { value: 'leozizz_pro' } })

    const submitBtn = screen.getByRole('button', { name: /salvar alterações/i })
    fireEvent.submit(submitBtn.closest('form')!)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fullName: 'Leonardo Silva Novo',
        username: 'leozizz_pro'
      })
    })

    expect(await screen.findByText(/perfil atualizado com sucesso!/i)).toBeInTheDocument()
  })

  it('deve exibir mensagem de erro se o nome tiver menos de 2 caracteres', async () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const nameInput = screen.getByLabelText(/nome completo/i)
    fireEvent.change(nameInput, { target: { value: 'A' } })

    const submitBtn = screen.getByRole('button', { name: /salvar alterações/i })
    fireEvent.submit(submitBtn.closest('form')!)

    expect(await screen.findByText(/nome completo deve conter pelo menos 2 caracteres/i)).toBeInTheDocument()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('deve chamar onOpenLogoutConfirm ao clicar em Encerrar Sessão', () => {
    const onOpenLogoutConfirm = vi.fn()
    const onClose = vi.fn()

    render(
      <ProfileModal
        isOpen={true}
        onClose={onClose}
        onOpenLogoutConfirm={onOpenLogoutConfirm}
      />
    )

    const logoutTrigger = screen.getByRole('button', { name: /encerrar sessão/i })
    fireEvent.click(logoutTrigger)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOpenLogoutConfirm).toHaveBeenCalledTimes(1)
  })

  it('deve chamar onOpenDangerZone ao clicar em Gerenciar Dados na seção Zona de Perigo', () => {
    const onOpenDangerZone = vi.fn()
    const onClose = vi.fn()

    render(
      <ProfileModal
        isOpen={true}
        onClose={onClose}
        onOpenDangerZone={onOpenDangerZone}
      />
    )

    const dangerZoneBtn = screen.getByTestId('open-danger-zone-btn')
    fireEvent.click(dangerZoneBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOpenDangerZone).toHaveBeenCalledTimes(1)
  })
})
