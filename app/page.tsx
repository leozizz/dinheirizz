"use client"

import { BalanceCard } from "@/components/balance-card"
import { QuickActions } from "@/components/quick-actions"
import { ExpensePieChart } from "@/components/expense-pie-chart"
import { TransactionsList } from "@/components/transactions-list"
import { Bell, Settings, Search } from "lucide-react"

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[40%] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[35%] bg-accent/6 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-5%] w-[30%] h-[25%] bg-chart-3/5 rounded-full blur-[80px]" />
        {/* Additional orbs for larger screens */}
        <div className="hidden lg:block absolute top-[20%] left-[40%] w-[25%] h-[20%] bg-primary/5 rounded-full blur-[100px]" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 px-5 md:px-8 lg:px-10 pt-safe-top">
          <div className="flex items-center justify-between py-4 lg:py-5 backdrop-blur-xl bg-background/60 -mx-5 md:-mx-8 lg:-mx-10 px-5 md:px-8 lg:px-10">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm lg:text-base font-semibold text-primary-foreground">
                JS
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Olá,</p>
                <p className="text-sm lg:text-base font-semibold text-foreground">João Silva</p>
              </div>
            </div>
            
            {/* Search bar - visible on tablet and desktop */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8 lg:mx-12">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  className="w-full pl-11 pr-4 py-2.5 lg:py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1 lg:gap-2">
              <button 
                className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                aria-label="Notificações"
              >
                <div className="relative">
                  <Bell className="w-5 h-5 lg:w-5.5 lg:h-5.5 text-foreground/70" strokeWidth={1.5} />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                </div>
              </button>
              <button 
                className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                aria-label="Configurações"
              >
                <Settings className="w-5 h-5 lg:w-5.5 lg:h-5.5 text-foreground/70" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="px-5 md:px-8 lg:px-10 pb-8 lg:pb-12">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-5">
            <section aria-label="Saldo">
              <BalanceCard />
            </section>
            
            <section aria-label="Ações rápidas">
              <QuickActions />
            </section>
            
            <section aria-label="Gráfico de gastos">
              <ExpensePieChart />
            </section>
            
            <section aria-label="Transações recentes">
              <TransactionsList />
            </section>
          </div>
          
          {/* Tablet Layout (md) */}
          <div className="hidden md:block lg:hidden space-y-6">
            {/* Row 1: Balance + Quick Actions */}
            <div className="grid grid-cols-2 gap-5">
              <section aria-label="Saldo">
                <BalanceCard />
              </section>
              <section aria-label="Ações rápidas">
                <QuickActions layout="grid-2x2" />
              </section>
            </div>
            
            {/* Row 2: Chart + Transactions */}
            <div className="grid grid-cols-2 gap-5">
              <section aria-label="Gráfico de gastos">
                <ExpensePieChart />
              </section>
              <section aria-label="Transações recentes">
                <TransactionsList maxItems={5} />
              </section>
            </div>
          </div>
          
          {/* Desktop Layout (lg+) */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6 xl:gap-8">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-6">
              {/* Top Row: Balance + Quick Actions */}
              <div className="grid grid-cols-5 gap-6">
                <section aria-label="Saldo" className="col-span-3">
                  <BalanceCard size="large" />
                </section>
                <section aria-label="Ações rápidas" className="col-span-2">
                  <QuickActions layout="grid-2x2" size="large" />
                </section>
              </div>
              
              {/* Transactions - Full Width */}
              <section aria-label="Transações recentes">
                <TransactionsList layout="table" />
              </section>
            </div>
            
            {/* Right Column - Sidebar */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-6">
              {/* Expense Chart */}
              <section aria-label="Gráfico de gastos">
                <ExpensePieChart size="large" />
              </section>
              
              {/* Monthly Summary Card */}
              <section aria-label="Resumo mensal">
                <MonthlySummary />
              </section>
            </div>
          </div>
        </main>
        
        {/* Bottom Safe Area Padding */}
        <div className="h-safe-bottom" />
      </div>
    </div>
  )
}

function MonthlySummary() {
  return (
    <div className="relative rounded-3xl border border-white/10 p-6 backdrop-blur-xl backdrop-saturate-150 bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="relative z-10">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Resumo do Mês</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground/70">Receitas</span>
            <span className="text-sm font-semibold text-emerald-400">+R$ 8.500,00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground/70">Despesas</span>
            <span className="text-sm font-semibold text-rose-400">-R$ 4.000,00</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Balanço</span>
            <span className="text-base font-bold text-primary">+R$ 4.500,00</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Meta de economia</span>
            <span>75%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
