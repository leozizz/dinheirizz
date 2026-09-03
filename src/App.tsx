import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Dashboard, TransactionItem } from './components/dashboard/Dashboard'
import { ActionType } from './components/dashboard/QuickActions'
import { TransactionModal, TransactionMode } from './components/modals/TransactionModal'
import { PixWalletModal, PixKeyItem } from './components/modals/PixWalletModal'
import { LoginScreen } from './components/auth/LoginScreen'
import { Wallet, Bell, ShieldCheck, LogIn, LogOut, User as UserIcon } from 'lucide-react'

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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [transactions, setTransactions] = useState<TransactionItem[]>(initialTransactions)
  const [pixKeys] = useState<PixKeyItem[]>(initialPixKeys)

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [txMode, setTxMode] = useState<TransactionMode>('income')
  const [isPixModalOpen, setIsPixModalOpen] = useState(false)

  // Totais calculados
  const totalIncome = 18200.0
  const totalExpense = 3349.8
  const totalBalance = 14850.2

  const handleActionClick = (action: ActionType) => {
    if (action === 'pix') {
      setIsPixModalOpen(true)
    } else {
      setTxMode(action as TransactionMode)
      setIsTxModalOpen(true)
    }
  }

  const handleCreateTransaction = (data: {
    amount: number
    description: string
    categoryId?: string
    accountId?: string
    occurredAt: string
    type: TransactionMode
  }) => {
    const isExpense = data.type === 'expense'
    const finalAmount = isExpense ? -Math.abs(data.amount) : Math.abs(data.amount)

    const cat = initialCategories.find((c) => c.id === data.categoryId)

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      description: data.description || (data.type === 'income' ? 'Nova Receita' : 'Nova Despesa'),
      amount: finalAmount,
      paid: true,
      occurred_at: data.occurredAt || new Date().toISOString(),
      category: cat ? { name: cat.name, color: isExpense ? '#f43f5e' : '#10b981' } : null,
      type: data.type
    }

    setTransactions((prev) => [newTx, ...prev])
  }

  if (showAuthModal && !user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAuthModal(false)}
          className="fixed top-6 right-6 z-50 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 cursor-pointer transition-all"
        >
          Voltar ao Dashboard
        </button>
        <LoginScreen />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#0d0d12] text-foreground overflow-x-hidden pb-20">
      {/* Background Orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 rounded-full gradient-orb-primary pointer-events-none opacity-30" />
      <div className="fixed top-1/3 -right-24 w-96 h-96 rounded-full gradient-orb-accent pointer-events-none opacity-20" />

      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0d0d12]/80 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl avatar-gradient flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2 text-white font-display">
                Dinheirizz <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium border border-teal-500/30">2.0 PWA</span>
              </h1>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Cloudflare Pages & Supabase
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
                onClick={() => setShowAuthModal(true)}
                className="py-1.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 text-xs font-medium border border-blue-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Dashboard
          totalBalance={totalBalance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          transactions={transactions}
          onActionClick={handleActionClick}
        />
      </main>

      {/* Modal de Transações (Receita / Despesa / Transferência) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        mode={txMode}
        categories={initialCategories}
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
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
