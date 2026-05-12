import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Bell, Search, Settings } from "lucide-react"

import { BalanceCard } from "@/components/balance-card"
import { ExpensePieChart } from "@/components/expense-pie-chart"
import { QuickActions } from "@/components/quick-actions"
import { TransactionComposeModal } from "@/components/transaction-compose-modal"
import { TransactionsList } from "@/components/transactions-list"
import { serverGetTransactions } from "@/app/actions/transactions"
import { type TransactionRecord } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")

async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        return undefined
      },
    },
  })
}

function summarizeTransactions(transactions: TransactionRecord[]) {
  return transactions.reduce(
    (summary, transaction) => {
      const value = Number(transaction.amount)
      const categoryType = transaction.categories?.type ?? "expense"
      const signedValue = categoryType === "income" ? Math.abs(value) : -Math.abs(value)

      if (signedValue >= 0) {
        summary.income += signedValue
      } else {
        summary.expense += Math.abs(signedValue)
      }

      summary.net += signedValue
      summary.count += 1

      return summary
    },
    {
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    },
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value)
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    redirect("/")
  }

  const currentDate = new Date()
  const { data: transactionsData } = await serverGetTransactions(user.id, {
    limit: 8,
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  })

  const transactions = transactionsData ?? []
  const summary = summarizeTransactions(transactions)
  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Lucas"

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-12%] top-[-18%] h-[42%] w-[58%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-[8%] h-[28%] w-[30%] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute bottom-[-12%] left-[18%] h-[30%] w-[40%] rounded-full bg-chart-3/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl">
        <header className="sticky top-0 z-20 px-5 pt-safe-top md:px-8 lg:px-10">
          <div className="-mx-5 flex items-center justify-between bg-background/60 py-4 backdrop-blur-xl md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 lg:py-5">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground lg:h-12 lg:w-12 lg:text-base">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-muted-foreground lg:text-sm">Olá,</p>
                <p className="text-sm font-semibold text-foreground lg:text-base">{displayName}</p>
              </div>
            </div>

            <div className="hidden flex-1 items-center md:mx-8 md:flex lg:mx-12 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all lg:py-3"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 lg:gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/5 active:bg-white/10 lg:h-12 lg:w-12" aria-label="Notificações">
                <div className="relative">
                  <Bell className="h-5 w-5 text-foreground/70 lg:h-5.5 lg:w-5.5" strokeWidth={1.5} />
                  <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                </div>
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/5 active:bg-white/10 lg:h-12 lg:w-12" aria-label="Configurações">
                <Settings className="h-5 w-5 text-foreground/70 lg:h-5.5 lg:w-5.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-5 pb-8 md:px-8 lg:px-10 lg:pb-12">
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
              <TransactionsList transactions={transactions} />
            </section>

            <section aria-label="Resumo mensal">
              <MonthlySummaryCard
                income={summary.income}
                expense={summary.expense}
                net={summary.net}
                count={summary.count}
              />
            </section>
          </div>

          <div className="hidden space-y-6 md:block lg:hidden">
            <div className="grid grid-cols-2 gap-5">
              <section aria-label="Saldo">
                <BalanceCard />
              </section>
              <section aria-label="Ações rápidas">
                <QuickActions layout="grid-2x2" />
              </section>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <section aria-label="Gráfico de gastos">
                <ExpensePieChart />
              </section>
              <section aria-label="Transações recentes">
                <TransactionsList maxItems={5} transactions={transactions} />
              </section>
            </div>

            <section aria-label="Resumo mensal">
              <MonthlySummaryCard
                income={summary.income}
                expense={summary.expense}
                net={summary.net}
                count={summary.count}
              />
            </section>
          </div>

          <div className="hidden gap-6 lg:grid lg:grid-cols-12 xl:gap-8">
            <div className="space-y-6 lg:col-span-8 xl:col-span-8">
              <div className="grid grid-cols-5 gap-6">
                <section aria-label="Saldo" className="col-span-3">
                  <BalanceCard size="large" />
                </section>
                <section aria-label="Ações rápidas" className="col-span-2">
                  <QuickActions layout="grid-2x2" size="large" />
                </section>
              </div>

              <section aria-label="Transações recentes">
                <TransactionsList layout="table" transactions={transactions} />
              </section>
            </div>

            <div className="space-y-6 lg:col-span-4 xl:col-span-4">
              <section aria-label="Gráfico de gastos">
                <ExpensePieChart size="large" />
              </section>

              <section aria-label="Resumo mensal">
                <MonthlySummaryCard
                  income={summary.income}
                  expense={summary.expense}
                  net={summary.net}
                  count={summary.count}
                />
              </section>
            </div>
          </div>
        </main>

        <div className="h-safe-bottom" />
      </div>

      <TransactionComposeModal />
    </div>
  )
}

function MonthlySummaryCard({
  income,
  expense,
  net,
  count,
}: {
  income: number
  expense: number
  net: number
  count: number
}) {
  const savingsRate = income > 0 ? Math.max(0, Math.min(100, Math.round((net / income) * 100))) : 0

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150">
      <div className="relative z-10">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">Resumo do mês</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">Receitas</span>
            <span className="text-sm font-semibold text-emerald-400">{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">Despesas</span>
            <span className="text-sm font-semibold text-rose-400">-{formatCurrency(expense)}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Balanço</span>
            <span className={cn("text-base font-bold", net >= 0 ? "text-primary" : "text-rose-400")}>
              {formatCurrency(net)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Meta de economia</span>
            <span>{savingsRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${savingsRate}%` }} />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {count} transações carregadas para o período atual.
        </p>
      </div>
    </div>
  )
}