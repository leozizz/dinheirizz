"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  CreditCard,
  FileText,
  Flame,
  Home,
  Landmark,
  Plus,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type CategoryOption = {
  value: string
  label: string
  icon: typeof UtensilsCrossed
  tone: string
}

type AccountOption = {
  value: string
  label: string
  icon: typeof Wallet
}

const categories: CategoryOption[] = [
  { value: "alimentacao", label: "Alimentação", icon: UtensilsCrossed, tone: "text-orange-400" },
  { value: "lazer", label: "Lazer", icon: Sparkles, tone: "text-violet-400" },
  { value: "transporte", label: "Transporte", icon: CarFront, tone: "text-sky-400" },
  { value: "casa", label: "Casa", icon: Home, tone: "text-emerald-400" },
  { value: "compras", label: "Compras", icon: ShoppingBag, tone: "text-pink-400" },
  { value: "assinaturas", label: "Assinaturas", icon: Flame, tone: "text-amber-400" },
]

const accounts: AccountOption[] = [
  { value: "banco-x", label: "Banco X", icon: Landmark },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao-y", label: "Cartão Y", icon: CreditCard },
]

export function TransactionComposeModal() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(categories[0]?.value ?? "")
  const [account, setAccount] = useState(accounts[0]?.value ?? "")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState("12:00")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((item) => item.value === category),
    [category],
  )
  const selectedAccount = useMemo(
    () => accounts.find((item) => item.value === account),
    [account],
  )

  const formattedDateTime = date
    ? `${format(date, "dd/MM/yyyy")} • ${time}`
    : "Selecione data e hora"

  const resetForm = () => {
    setAmount("")
    setDescription("")
    setCategory(categories[0]?.value ?? "")
    setAccount(accounts[0]?.value ?? "")
    setDate(new Date())
    setTime("12:00")
    setCalendarOpen(false)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetForm()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setCalendarOpen(false)
        }
      }}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.2 }}
        onClick={() => setOpen(true)}
        aria-label="Adicionar transação"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "border border-white/15 bg-white/10 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
          "backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-white/15",
          "sm:bottom-8 sm:right-8",
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={1.8} />
      </motion.button>

      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0",
          "mx-auto w-full max-w-[560px] rounded-t-[32px] rounded-b-none border border-white/10",
          "bg-background/80 p-0 shadow-[0_-24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <motion.div
          initial={{ y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className="max-h-[calc(100vh-1rem)] overflow-y-auto"
        >
          <div className="px-5 pt-3">
            <div className="mx-auto h-1.5 w-14 rounded-full bg-white/15" />
          </div>

          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                    Nova transação
                  </DialogTitle>
                  <DialogDescription className="max-w-md text-sm leading-6 text-muted-foreground">
                    Insira valores com uma experiência rápida, minimalista e alinhada ao padrão de vidro do app.
                  </DialogDescription>
                </div>

                <DialogClose asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      "border border-white/10 bg-white/5 text-muted-foreground",
                      "transition-colors hover:bg-white/10 hover:text-foreground",
                    )}
                    aria-label="Fechar modal"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </DialogClose>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground">
                    Valor
                  </Label>
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                    <Input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className={cn(
                        "h-14 rounded-2xl border-white/10 bg-white/5 pl-11 text-base font-semibold text-foreground",
                        "placeholder:text-muted-foreground/50 focus-visible:bg-white/7",
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="account" className="text-xs font-medium text-muted-foreground">
                    Conta
                  </Label>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger
                      id="account"
                      className={cn(
                        "h-14 w-full rounded-2xl border-white/10 bg-white/5 px-4 text-left",
                        "focus:ring-primary/30",
                      )}
                    >
                      {selectedAccount ? (
                        <selectedAccount.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                      ) : null}
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-white/10 bg-popover/95 backdrop-blur-xl">
                      {accounts.map((item) => {
                        const Icon = item.icon
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                              {item.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
                  Descrição
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                  <Input
                    id="description"
                    type="text"
                    maxLength={72}
                    placeholder="Ex.: almoço, mensalidade, delivery..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className={cn(
                      "h-14 rounded-2xl border-white/10 bg-white/5 pl-11 text-sm text-foreground",
                      "placeholder:text-muted-foreground/50 focus-visible:bg-white/7",
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">
                    Categoria
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger
                      id="category"
                      className={cn(
                        "h-14 w-full rounded-2xl border-white/10 bg-white/5 px-4 text-left",
                        "focus:ring-primary/30",
                      )}
                    >
                      {selectedCategory ? (
                        <selectedCategory.icon className={cn("h-4 w-4", selectedCategory.tone)} strokeWidth={1.8} />
                      ) : null}
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-white/10 bg-popover/95 backdrop-blur-xl">
                      {categories.map((item) => {
                        const Icon = item.icon
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            <span className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", item.tone)} strokeWidth={1.8} />
                              {item.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-xs font-medium text-muted-foreground">Data e Hora</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4",
                          "text-left text-sm text-foreground transition-colors hover:bg-white/10",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <CalendarDays className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                          <span className="truncate">{formattedDateTime}</span>
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={12}
                      className="w-[min(92vw,24rem)] rounded-3xl border-white/10 bg-popover/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                    >
                      <div className="space-y-4">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className="rounded-2xl border border-white/10 bg-white/[0.03]"
                        />

                        <div className="space-y-2">
                          <Label htmlFor="time" className="text-xs font-medium text-muted-foreground">
                            Hora
                          </Label>
                          <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(event) => setTime(event.target.value)}
                            className="h-12 rounded-2xl border-white/10 bg-white/5"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-muted-foreground">
                Toque no botão para abrir uma experiência em estilo iOS, com animação de subida e acabamentos em vidro.
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <DialogClose asChild>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={cn(
                      "h-12 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-medium text-foreground",
                      "transition-colors hover:bg-white/10",
                    )}
                  >
                    Cancelar
                  </button>
                </DialogClose>

                <button
                  type="submit"
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-primary-foreground",
                    "bg-gradient-to-r from-primary to-accent shadow-[0_16px_40px_rgba(77,166,255,0.25)]",
                    "transition-transform hover:scale-[1.01] active:scale-[0.99]",
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
                  Salvar transação
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}