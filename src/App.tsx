import React, { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Dashboard, TransactionItem } from './components/dashboard/Dashboard'
import { ActionType } from './components/dashboard/QuickActions'
import { TransactionModal, TransactionMode } from './components/modals/TransactionModal'
import { PixWalletModal, PixKeyItem } from './components/modals/PixWalletModal'
import { AccountModal } from './components/modals/AccountModal'
import { LogoutConfirmModal } from './components/modals/LogoutConfirmModal'
import { ProfileModal } from './components/modals/ProfileModal'
import { DangerZoneModal } from './components/modals/DangerZoneModal'
import { LoginScreen } from './components/auth/LoginScreen'
import { WelcomeScreen } from './components/auth/WelcomeScreen'
import { useTransactions, useCreateTransaction } from './hooks/useTransactions'
import { useAccounts, useCreateAccount, type AccountItem } from './hooks/useAccounts'
import { useTransferTransaction } from './hooks/useTransfer'
import { usePixKeys, useCreatePixKey, useDeletePixKey } from './hooks/usePixKeys'
import { useCategories } from './hooks/useCategories'
import { Wallet, Bell, ShieldCheck, LogIn, LogOut } from 'lucide-react'

const initialTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    description: 'Salário Desenvolvimento',
    amount: 12000.0,
    paid: true,
    occurred_at: new Date().toISOString(),
    category: { name: 'Renda', color: '#10b981', icon: 'wallet' },
    type: 'income',
    accountId: 'acc-1'
  },
  {
    id: 'tx-2',
    description: 'Consultoria Frontend & BFF',
    amount: 6200.0,
    paid: true,
    occurred_at: new Date(Date.now() - 86400000).toISOString(),
    category: { name: 'Serviços', color: '#3b82f6', icon: 'laptop' },
    type: 'income',
    accountId: 'acc-1'
  },
  {
    id: 'tx-3',
    description: 'Supermercado & Alimentação',
    amount: -1450.5,
    paid: true,
    occurred_at: new Date(Date.now() - 172800000).toISOString(),
    category: { name: 'Alimentação', color: '#f59e0b', icon: 'utensils' },
    type: 'expense',
    accountId: 'acc-1'
  },
  {
    id: 'tx-4',
    description: 'Serviços de Nuvem & Infra',
    amount: -899.3,
    paid: true,
    occurred_at: new Date(Date.now() - 259200000).toISOString(),
    category: { name: 'Infraestrutura', color: '#8b5cf6', icon: 'server' },
    type: 'expense',
    accountId: 'acc-2'
  },
  {
    id: 'tx-5',
    description: 'Assinaturas de Software',
    amount: -1000.0,
    paid: true,
    occurred_at: new Date(Date.now() - 345600000).toISOString(),
    category: { name: 'Software', color: '#ec4899', icon: 'layers' },
    type: 'expense',
    accountId: 'acc-2'
  }
]

const initialPixKeys: PixKeyItem[] = [
  {
    id: 'pix-1',
    key_type: 'email',
    key_value: 'contato@dinheirizz.com',
    bank_name: 'Nubank Institucional',
    description: 'Chave Principal'
  },
  {
    id: 'pix-2',
    key_type: 'cpf',
    key_value: '123.456.789-00',
    bank_name: 'Itaú Personalité',
    description: 'Chave Pessoal'
  },
  {
    id: 'pix-3',
    key_type: 'random',
    key_value: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    bank_name: 'Inter PJ',
    description: 'Chave Aleatória Recebimentos'
  }
]

const initialCategories = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Renda / Salário', type: 'income' },
  { id: 'cat-3', name: 'Infraestrutura', type: 'expense' },
  { id: 'cat-4', name: 'Transporte', type: 'expense' },
  { id: 'cat-5', name: 'Serviços & Freelas', type: 'income' }
]

const initialAccounts: AccountItem[] = [
  { id: 'acc-1', name: 'Nubank Principal', type: 'checking', balance: 10500, bank: 'Nubank', color: '#820ad1' },
  { id: 'acc-2', name: 'Itaú Reserva de Emergência', type: 'savings', balance: 4350.2, bank: 'Itaú', color: '#ec7000' }
]

function MainApp() {
  const { user, signOut } = useAuth()
  const [unauthView, setUnauthView] = useState<'welcome' | 'login' | 'demo'>('welcome')
  const [demoTransactions, setDemoTransactions] = useState<TransactionItem[]>(initialTransactions)
  const [demoAccounts, setDemoAccounts] = useState<AccountItem[]>(initialAccounts)
  const [demoPixKeys, setDemoPixKeys] = useState<PixKeyItem[]>(initialPixKeys)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [txMode, setTxMode] = useState<TransactionMode>('income')
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false)

  // TanStack Query Hooks (Carregamento reativo da API do BFF)
  const {
    transactions: apiTransactions,
    totalBalance: apiBalance,
    totalIncome: apiIncome,
    totalExpense: apiExpense,
    isLoading: isTxLoading,
    total: apiTotal,
    hasMore: apiHasMore,
    isLoadingMore: apiIsLoadingMore,
    loadMore: apiLoadMore
  } = useTransactions({ accountId: selectedAccountId || undefined })

  const { accounts: apiAccounts, isLoading: isAccountsLoading } = useAccounts()
  const createAccountMutation = useCreateAccount()
  const transferMutation = useTransferTransaction()
  const { pixKeys: apiPixKeys } = usePixKeys()
  const createPixMutation = useCreatePixKey()
  const deletePixMutation = useDeletePixKey()

  const { categories: apiCategories } = useCategories()
  const createTxMutation = useCreateTransaction()

  // Totais do modo de demonstração
  let demoIncome = 0
  let demoExpense = 0
  for (const t of demoTransactions) {
    if (t.amount > 0) demoIncome += t.amount
    else demoExpense += Math.abs(t.amount)
  }
  const demoBalance = demoIncome - demoExpense

  const activeAccounts = user ? apiAccounts : demoAccounts
  const activePixKeys = user ? apiPixKeys : demoPixKeys
  const activeTransactions = user ? apiTransactions : demoTransactions
  const activeBalance = activeAccounts.length > 0
    ? activeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
    : (user ? apiBalance : demoBalance)
  const activeIncome = user ? apiIncome : demoIncome
  const activeExpense = user ? apiExpense : demoExpense
  const activeCategories = apiCategories.length > 0 ? apiCategories : initialCategories

  const handleActionClick = (action: ActionType) => {
    if (action === 'pix') {
      setIsPixModalOpen(true)
    } else {
      setTxMode(action as TransactionMode)
      setIsTxModalOpen(true)
    }
  }

  const handleCreateTransaction = async (data: {
    amount: number
    description: string
    categoryId?: string
    accountId?: string
    fromAccountId?: string
    toAccountId?: string
    occurredAt: string
    type: TransactionMode
  }) => {
    if (user) {
      try {
        if (data.type === 'transfer') {
          if (!data.fromAccountId || !data.toAccountId) {
            throw new Error('Contas de origem e destino são obrigatórias.')
          }
          await transferMutation.mutateAsync({
            amount: data.amount,
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            description: data.description || undefined
          })
          toast.success('Transferência realizada com sucesso!')
        } else {
          await createTxMutation.mutateAsync({
            amount: data.amount,
            description: data.description,
            categoryId: data.categoryId,
            accountId: data.accountId,
            occurredAt: data.occurredAt,
            type: data.type
          })
          const successMsg =
            data.type === 'income'
              ? 'Receita registrada com sucesso!'
              : 'Despesa registrada com sucesso!'
          toast.success(successMsg)
        }
        setIsTxModalOpen(false)
      } catch (err: any) {
        toast.error(err?.message || 'Erro ao registrar movimentação')
      }
    } else {
      // Modo Demonstração (em memória)
      if (data.type === 'transfer') {
        const fromAcc = demoAccounts.find((a) => a.id === data.fromAccountId)
        const toAcc = demoAccounts.find((a) => a.id === data.toAccountId)

        setDemoAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === data.fromAccountId) {
              return { ...acc, balance: acc.balance - data.amount }
            }
            if (acc.id === data.toAccountId) {
              return { ...acc, balance: acc.balance + data.amount }
            }
            return acc
          })
        )

        const debitTx: TransactionItem = {
          id: `tx-transfer-out-${Date.now()}`,
          description: `Transferência enviada para ${toAcc?.name || 'conta'}`,
          amount: -data.amount,
          paid: true,
          occurred_at: data.occurredAt || new Date().toISOString(),
          category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
          type: 'transfer',
          accountId: data.fromAccountId
        }

        const creditTx: TransactionItem = {
          id: `tx-transfer-in-${Date.now()}`,
          description: `Transferência recebida de ${fromAcc?.name || 'conta'}`,
          amount: data.amount,
          paid: true,
          occurred_at: data.occurredAt || new Date().toISOString(),
          category: { name: 'Transferência', color: '#3b82f6', icon: 'arrow-left-right' },
          type: 'transfer',
          accountId: data.toAccountId
        }

        setDemoTransactions((prev) => [debitTx, creditTx, ...prev])
        toast.success('Transferência registrada (modo demonstração)!')
        setIsTxModalOpen(false)
        return
      }

      const isExpense = data.type === 'expense'
      const finalAmount = isExpense ? -Math.abs(data.amount) : Math.abs(data.amount)
      const cat = activeCategories.find((c) => c.id === data.categoryId)

      const newTx: TransactionItem = {
        id: `tx-${Date.now()}`,
        description: data.description || (data.type === 'income' ? 'Nova Receita' : 'Nova Despesa'),
        amount: finalAmount,
        paid: true,
        occurred_at: data.occurredAt || new Date().toISOString(),
        category: cat ? { name: cat.name, color: isExpense ? '#f43f5e' : '#10b981' } : null,
        type: data.type,
        accountId: data.accountId
      }

      const targetAccId = data.accountId || demoAccounts[0]?.id
      if (targetAccId) {
        setDemoAccounts((prev) =>
          prev.map((acc) =>
            acc.id === targetAccId
              ? { ...acc, balance: acc.balance + finalAmount }
              : acc
          )
        )
      }

      setDemoTransactions((prev) => {
        const updated = [newTx, ...prev]
        return updated.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      })
      toast.success('Transação registrada (modo demonstração)!')
      setIsTxModalOpen(false)
    }
  }

  const handleCreateAccount = async (data: {
    name: string
    type: 'checking' | 'savings' | 'investment' | 'credit'
    balance: number
    bank?: string
    color?: string
  }) => {
    if (user) {
      await createAccountMutation.mutateAsync(data)
      toast.success('Conta criada com sucesso!')
    } else {
      const newAcc: AccountItem = {
        id: `acc-${Date.now()}`,
        name: data.name,
        type: data.type,
        balance: data.balance,
        bank: data.bank,
        color: data.color
      }
      setDemoAccounts((prev) => [...prev, newAcc])
      toast.success('Conta criada (modo demonstração)!')
    }
  }

  const handleCreatePixKey = async (data: {
    keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
    keyValue: string
    bankName?: string
    label?: string
  }) => {
    if (user) {
      await createPixMutation.mutateAsync(data)
      toast.success('Chave Pix cadastrada com sucesso!')
    } else {
      const newKey: PixKeyItem = {
        id: `pix-${Date.now()}`,
        key_type: data.keyType,
        key_value: data.keyValue,
        bank_name: data.bankName,
        description: data.label
      }
      setDemoPixKeys((prev) => [...prev, newKey])
      toast.success('Chave Pix cadastrada (modo demonstração)!')
    }
  }

  const handleDeletePixKey = async (id: string) => {
    if (user) {
      await deletePixMutation.mutateAsync(id)
      toast.success('Chave Pix removida!')
    } else {
      setDemoPixKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('Chave Pix removida (modo demonstração)!')
    }
  }

  const handleDeleteTransactionsDemo = () => {
    setDemoTransactions([])
    setDemoAccounts((prev) => prev.map((a) => ({ ...a, balance: 0 })))
  }

  const handleDeletePixKeysDemo = () => {
    setDemoPixKeys([])
  }

  const handleDeleteAccountsDemo = () => {
    setDemoAccounts([initialAccounts[0]])
    setDemoTransactions([])
    setSelectedAccountId('')
  }

  const handleResetAllDemo = () => {
    setDemoTransactions([])
    setDemoPixKeys([])
    setDemoAccounts([initialAccounts[0]])
    setSelectedAccountId('')
  }

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'US'

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      setIsLogoutModalOpen(false)
      setIsProfileModalOpen(false)
      setUnauthView('welcome')
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Usuário não autenticado: tela inicial é Boas-Vindas ou Login (não o dashboard privado)
  if (!user && unauthView !== 'demo') {
    if (unauthView === 'login') {
      return (
        <div className="relative">
          <button
            onClick={() => setUnauthView('welcome')}
            className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 min-h-[40px] px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 cursor-pointer transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
          >
            ← Voltar
          </button>
          <LoginScreen />
        </div>
      )
    }

    return (
      <WelcomeScreen
        onGoToLogin={() => setUnauthView('login')}
        onExploreDemo={() => setUnauthView('demo')}
      />
    )
  }

  return (
    <div className="relative min-h-dvh bg-[#0d0d12] text-foreground overflow-x-hidden pb-20">
      {/* Background Orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 rounded-full gradient-orb-primary pointer-events-none opacity-30" />
      <div className="fixed top-1/3 -right-24 w-96 h-96 rounded-full gradient-orb-accent pointer-events-none opacity-20" />

      {/* Top Bar with Floating Capsule and Safe Area Support */}
      <header className="sticky top-0 z-30 pt-3 sm:pt-5 pb-2 px-3.5 sm:px-6 transition-all">
        <div className="max-w-4xl mx-auto backdrop-blur-2xl bg-[#12121b]/85 border border-white/10 rounded-2xl sm:rounded-3xl px-3.5 py-2.5 sm:px-6 sm:py-3 shadow-2xl shadow-black/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl avatar-gradient flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10 flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-lg tracking-tight flex items-center gap-1.5 sm:gap-2 text-white font-display">
                Dinheirizz <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium border border-teal-500/30">2.0 PWA</span>
              </h1>
              <p className="text-[11px] text-neutral-400 hidden sm:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Cloudflare Pages & BFF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Notificações"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-white border border-white/10 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  data-testid="user-profile-avatar-btn"
                  title={user.fullName ? `${user.fullName} (@${user.username || 'perfil'})` : (user.email || 'Meu Perfil')}
                  aria-label="Abrir configurações de perfil"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full avatar-gradient flex items-center justify-center font-bold text-xs sm:text-sm text-white border border-white/20 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {userInitials}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  data-testid="header-logout-btn"
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setUnauthView('login')}
                className="py-1.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 text-xs font-medium border border-blue-500/30 flex items-center gap-1.5 cursor-pointer transition-all min-h-[36px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo Banner for Unauthenticated Users */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-600/20 via-teal-500/20 to-purple-600/20 border-b border-white/10 px-3 py-2 text-center text-xs text-neutral-300 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Modo de demonstração.</span>
          <button
            onClick={() => setUnauthView('login')}
            className="text-teal-300 font-semibold underline hover:text-white transition-colors cursor-pointer"
          >
            Fazer login ou cadastrar
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
        <Dashboard
          totalBalance={activeBalance}
          totalIncome={activeIncome}
          totalExpense={activeExpense}
          transactions={activeTransactions}
          onActionClick={handleActionClick}
          isLoading={Boolean(user && (isTxLoading || isAccountsLoading))}
          accounts={activeAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onNewAccount={() => setIsAccountModalOpen(true)}
          hasMore={user ? apiHasMore : false}
          isLoadingMore={user ? apiIsLoadingMore : false}
          onLoadMore={user ? apiLoadMore : undefined}
          totalCount={user ? apiTotal : activeTransactions.length}
        />
      </main>

      {/* Modal de Transações (Receita / Despesa / Transferência) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        mode={txMode}
        categories={activeCategories}
        accounts={activeAccounts}
        defaultAccountId={selectedAccountId || undefined}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={handleCreateTransaction}
      />

      {/* Modal de Carteira Pix */}
      <PixWalletModal
        isOpen={isPixModalOpen}
        pixKeys={activePixKeys}
        onClose={() => setIsPixModalOpen(false)}
        onCreatePixKey={handleCreatePixKey}
        onDeletePixKey={handleDeletePixKey}
      />

      {/* Modal de Criação de Conta */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSubmit={handleCreateAccount}
      />

      {/* Modal de Perfil e Configurações */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenLogoutConfirm={() => setIsLogoutModalOpen(true)}
        onOpenDangerZone={() => setIsDangerZoneOpen(true)}
      />

      {/* Modal de Gestão de Dados e Zona de Perigo */}
      <DangerZoneModal
        isOpen={isDangerZoneOpen}
        onClose={() => setIsDangerZoneOpen(false)}
        onSuccessNotification={(msg) => toast.success(msg)}
        onDeleteTransactions={user ? undefined : handleDeleteTransactionsDemo}
        onDeletePixKeys={user ? undefined : handleDeletePixKeysDemo}
        onDeleteAccounts={user ? undefined : handleDeleteAccountsDemo}
        onResetAllData={user ? undefined : handleResetAllDemo}
      />

      {/* Modal de Confirmação de Logout */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />

      {/* Toaster Glassmorphism */}
      <Toaster position="bottom-right" richColors theme="dark" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}
