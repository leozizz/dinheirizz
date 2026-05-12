"use client"

import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import {
  Apple,
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")

type Provider = "google" | "apple"

export function LoginScreen() {
  const router = useRouter()
  const [supabase] = useState(() => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY))
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (data.session) {
        router.replace("/dashboard")
        return
      }

      setIsSessionLoading(false)
    }

    loadSession().catch(() => {
      if (isMounted) {
        setIsSessionLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const handleSignIn = async (provider: Provider) => {
    setErrorMessage(null)
    setActiveProvider(provider)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setActiveProvider(null)
    }
  }

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsEmailLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsEmailLoading(false)
      return
    }

    router.replace("/dashboard")
  }

  const isBusy = isSessionLoading || activeProvider !== null || isEmailLoading
  const providerButtons = useMemo(
    () => [
      {
        key: "google" as const,
        label: "Login com Google",
        icon: Chrome,
      },
      {
        key: "apple" as const,
        label: "Login com Apple",
        icon: Apple,
      },
    ],
    [],
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-18%] h-[42%] w-[58%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-[8%] h-[28%] w-[30%] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute bottom-[-12%] left-[18%] h-[30%] w-[40%] rounded-full bg-chart-3/10 blur-[120px]" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 md:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
            Acesso seguro ao Dinheirizz
          </div>

          <GlassCard variant="strong" className="overflow-hidden">
            <div className="relative space-y-8">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Entre com sua conta
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Login minimalista com Supabase Auth e isolamento por RLS para manter seus dados financeiros seguros.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {providerButtons.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    type="button"
                    onClick={() => handleSignIn(key)}
                    disabled={isBusy}
                    className={cn(
                      "h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-foreground shadow-none",
                      "backdrop-blur-xl hover:bg-white/10",
                    )}
                    variant="outline"
                  >
                    {activeProvider === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                    )}
                    {label}
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  </Button>
                ))}

                <Button
                  type="button"
                  onClick={() => setIsEmailFormOpen((current) => !current)}
                  disabled={isBusy}
                  className={cn(
                    "h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-foreground shadow-none",
                    "backdrop-blur-xl hover:bg-white/10",
                  )}
                  variant="outline"
                >
                  <Mail className="h-4 w-4 text-accent" strokeWidth={1.8} />
                  Entrar com e-mail
                  <ArrowRight className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", isEmailFormOpen && "rotate-90")} strokeWidth={1.8} />
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {isEmailFormOpen ? (
                  <motion.form
                    key="email-form"
                    onSubmit={handleEmailSignIn}
                    initial={{ height: 0, opacity: 0, y: -8 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -8 }}
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="voce@exemplo.com"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="h-12 rounded-2xl border-white/10 bg-white/5 pl-11 text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Sua senha"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="h-12 rounded-2xl border-white/10 bg-white/5 pl-11 pr-12 text-foreground placeholder:text-muted-foreground/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_16px_40px_rgba(77,166,255,0.2)] hover:opacity-95"
                    >
                      {isEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Entrar agora
                    </Button>
                  </motion.form>
                ) : null}
              </AnimatePresence>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-muted-foreground">
                O fluxo usa Supabase Auth com OAuth e mantém a UI leve, centrada e otimizada para mobile first.
              </div>
            </div>
          </GlassCard>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            Ao continuar, você concorda com a autenticação segura via Supabase e com a proteção de dados por RLS.
          </p>
        </div>
      </main>
    </div>
  )
}