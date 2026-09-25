import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileModal } from '../components/modals/ProfileModal'
import type { UserAiSettingsData } from '../hooks/useUserAiSettings'

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

const mockUpdateAiMutateAsync = vi.fn()
const mockTestKeyMutateAsync = vi.fn()
const mockDeleteAiMutateAsync = vi.fn()
const mockSendAdminInviteMutateAsync = vi.fn()
const mockRefetchAdminUsers = vi.fn()
let mockAdminUsersList = [
  {
    id: 'u-1',
    email: 'outro@dinheirizz.com',
    fullName: 'Outro Usuário',
    role: 'free' as const,
    proType: null,
    proExpiresAt: null,
    createdAt: new Date().toISOString()
  }
]
let mockAiSettingsData: UserAiSettingsData = {
  provider: 'gemini',
  customModel: 'gemini-1.5-flash',
  isActive: true,
  hasKey: false,
  maskedKey: null,
  lastTestedAt: null,
  role: 'free'
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

vi.mock('../hooks/useUserAiSettings', () => ({
  useUserAiSettings: () => ({
    data: mockAiSettingsData,
    isLoading: false
  }),
  useUpdateUserAiSettings: () => ({
    mutateAsync: mockUpdateAiMutateAsync,
    isPending: false
  }),
  useTestUserAiKey: () => ({
    mutateAsync: mockTestKeyMutateAsync,
    isPending: false
  }),
  useDeleteUserAiSettings: () => ({
    mutateAsync: mockDeleteAiMutateAsync,
    isPending: false
  }),
  useAdminUsers: () => ({
    data: mockAdminUsersList,
    isLoading: false,
    refetch: mockRefetchAdminUsers
  }),
  useSendAdminInvite: () => ({
    mutateAsync: mockSendAdminInviteMutateAsync,
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
    mockAiSettingsData = {
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      isActive: true,
      hasKey: false,
      maskedKey: null,
      lastTestedAt: null,
      role: 'free'
    }
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

  it('deve renderizar seção BYOK com links e inputs', () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText(/Inteligência Artificial \(BYOK\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Custo Zero/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Chave de API \(Google AI Studio\)/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /obter chave grátis/i })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/app/apikey'
    )
  })

  it('deve testar a chave ao clicar em "Testar Conexão"', async () => {
    mockTestKeyMutateAsync.mockResolvedValueOnce({
      success: true,
      message: 'Conexão com Gemini validada!',
      modelName: 'gemini-1.5-flash'
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const keyInput = screen.getByLabelText(/Chave de API \(Google AI Studio\)/i)
    fireEvent.change(keyInput, { target: { value: 'AIzaSyValidTestingKey123' } })

    const testBtn = screen.getByTestId('test-byok-key-btn')
    fireEvent.click(testBtn)

    await waitFor(() => {
      expect(mockTestKeyMutateAsync).toHaveBeenCalledWith({
        apiKey: 'AIzaSyValidTestingKey123',
        provider: 'gemini'
      })
    })

    expect(await screen.findByText(/Conexão com Gemini validada!/i)).toBeInTheDocument()
  })

  it('deve salvar a chave ao clicar em "Salvar Chave"', async () => {
    mockUpdateAiMutateAsync.mockResolvedValueOnce({
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      isActive: true,
      hasKey: true,
      maskedKey: 'AIzaSy***123',
      lastTestedAt: new Date().toISOString(),
      role: 'free'
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const keyInput = screen.getByLabelText(/Chave de API \(Google AI Studio\)/i)
    fireEvent.change(keyInput, { target: { value: 'AIzaSyValidTestingKey123' } })

    const saveBtn = screen.getByTestId('save-byok-key-btn')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdateAiMutateAsync).toHaveBeenCalledWith({
        apiKey: 'AIzaSyValidTestingKey123',
        provider: 'gemini',
        customModel: 'gemini-1.5-flash',
        isActive: true
      })
    })

    expect(await screen.findByText(/Configurações de IA salvas com sucesso!/i)).toBeInTheDocument()
  })

  it('deve remover a chave ao clicar no botão "Remover"', async () => {
    mockAiSettingsData = {
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      isActive: true,
      hasKey: true,
      maskedKey: 'AIzaSy***999',
      lastTestedAt: new Date().toISOString(),
      role: 'free'
    }

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('AIzaSy***999')).toBeInTheDocument()

    const removeBtn = screen.getByTestId('remove-byok-key-btn')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(mockDeleteAiMutateAsync).toHaveBeenCalledTimes(1)
    })
  })

  it('deve exibir badge Admin e seção de convites PRO quando o usuário for Admin', () => {
    mockAiSettingsData = {
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      isActive: true,
      hasKey: false,
      maskedKey: null,
      lastTestedAt: null,
      role: 'admin'
    }

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText(/Área Administrativa • Convites PRO/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Digite o e-mail do usuário/i)).toBeInTheDocument()
  })

  it('deve conceder convite PRO para um usuário pelo e-mail na área administrativa', async () => {
    mockAiSettingsData = {
      provider: 'gemini',
      customModel: 'gemini-1.5-flash',
      isActive: true,
      hasKey: false,
      maskedKey: null,
      lastTestedAt: null,
      role: 'admin'
    }

    mockSendAdminInviteMutateAsync.mockResolvedValueOnce({
      message: 'Acesso Pro concedido por convite com sucesso!'
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const emailInput = screen.getByPlaceholderText(/Digite o e-mail do usuário/i)
    fireEvent.change(emailInput, { target: { value: 'amigo@dinheirizz.com' } })

    const sendBtn = screen.getByTestId('send-admin-invite-btn')
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(mockSendAdminInviteMutateAsync).toHaveBeenCalledWith({
        email: 'amigo@dinheirizz.com',
        action: 'grant'
      })
    })

    expect(await screen.findByText(/Acesso Pro concedido por convite com sucesso!/i)).toBeInTheDocument()
  })
})


