import React, { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Dashboard, TransactionItem } from './components/dashboard/Dashboard'
import { ActionType } from './components/dashboard/QuickActions'
import { TransactionModal, TransactionMode } from './components/modals/TransactionModal'
import { PixWalletModal, PixKeyItem } from './components/modals/PixWalletModal'
import { LoginScreen } from './components/auth/LoginScreen'
import { WelcomeScreen } from './components/auth/WelcomeScreen'
import { useTransactions, useCreateTransaction } from './hooks/useTransactions'
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
    type: 'income'
  },
  {
    id: 'tx-2',
    description: 'Consultoria Frontend & BFF',
    amount: 6200.0,
    paid: true,
    occurred_at: new Date(Date.now() - 86400000).toISOString(),
    category: { name: 'Serviços', color: '#3b82f6', icon: 'laptop' },
    type: 'income'
  },
  {
    id: 'tx-3',
    description: 'Supermercado & Alimentação',
    amount: -1450.5,
    paid: true,
    occurred_at: new Date(Date.now() - 172800000).toISOString(),
    category: { name: 'Alimentação', color: '#f59e0b', icon: 'utensils' },
    type: 'expense'
  },
  {
    id: 'tx-4',
    description: 'Serviços de Nuvem & Infra',
    amount: -899.3,
    paid: true,
    occurred_at: new Date(Date.now() - 259200000).toISOString(),
    category: { name: 'Infraestrutura', color: '#8b5cf6', icon: 'server' },
    type: 'expense'
  },
  {
    id: 'tx-5',
    description: 'Assinaturas de Software',
    amount: -1000.0,
    paid: true,
    occurred_at: new Date(Date.now() - 345600000).toISOString(),
    category: { name: 'Software', color: '#ec4899', icon: 'layers' },
    type: 'expense'
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

const initialAccounts = [
  { id: 'acc-1', name: 'Nubank Principal', balance: 10500 },
  { id: 'acc-2', name: 'Itaú Reserva de Emergência', balance: 4350.2 }
]

function MainApp() {
  const { user, signOut } = useAuth()
  const [unauthView, setUnauthView] = useState<'welcome' | 'login' | 'demo'>('welcome')
  const [demoTransactions, setDemoTransactions] = useState<TransactionItem[]>(initialTransactions)
  const [pixKeys] = useState<PixKeyItem[]>(initialPixKeys)

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [txMode, setTxMode] = useState<TransactionMode>('income')
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)

  // TanStack Query Hooks (Carregamento reativo da API do BFF)
  const {
    transactions: apiTransactions,
    totalBalance: apiBalance,
    totalIncome: apiIncome,
    totalExpense: apiExpense,
    isLoading: isTxLoading
  } = useTransactions()

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

  const activeTransactions = user ? apiTransactions : demoTransactions
  const activeBalance = user ? apiBalance : demoBalance
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
    occurredAt: string
    type: TransactionMode
  }) => {
    if (user) {
      try {
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
            : data.type === 'transfer'
            ? 'Transferência registrada com sucesso!'
            : 'Despesa registrada com sucesso!'
        toast.success(successMsg)
        setIsTxModalOpen(false)
      } catch (err: any) {
        toast.error(err?.message || 'Erro ao registrar movimentação')
      }
    } else {
      // Modo Demonstração (em memória)
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
        type: data.type
      }

      setDemoTransactions((prev) => [newTx, ...prev])
      toast.success('Transação registrada (modo demonstração)!')
      setIsTxModalOpen(false)
    }
  }

  // Usuário não autenticado: tela inicial é Boas-Vindas ou Login (não o dashboard privado)
  if (!user && unauthView !== 'demo') {
    if (unauthView === 'login') {
      return (
        <div className="relative">
          <button
            onClick={() => setUnauthView('welcome')}
            className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 cursor-pointer transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
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

      {/* Top Bar with Safe Area Top */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0d0d12]/80 border-b border-white/10 px-3.5 py-2.5 sm:px-6 sm:py-3 pt-safe-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
              className="w-9 h-9 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-white border border-white/10 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  title={user.email || 'Usuário'}
                  className="w-9 h-9 rounded-full avatar-gradient flex items-center justify-center font-bold text-xs text-white border border-white/20 shadow-sm"
                >
                  {user.email ? user.email.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <button
                  onClick={() => signOut()}
                  title="Sair da conta"
                  className="w-9 h-9 rounded-full glass-card-interactive flex items-center justify-center text-neutral-400 hover:text-rose-400 border border-white/10 cursor-pointer"
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
          isLoading={Boolean(user && isTxLoading)}
        />
      </main>

      {/* Modal de Transações (Receita / Despesa / Transferência) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        mode={txMode}
        categories={activeCategories}
        accounts={initialAccounts}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={handleCreateTransaction}
      />

      {/* Modal de Carteira Pix */}
      <PixWalletModal
        isOpen={isPixModalOpen}
        pixKeys={pixKeys}
        onClose={() => setIsPixModalOpen(false)}
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
