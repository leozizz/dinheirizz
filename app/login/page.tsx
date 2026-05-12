import type { Metadata } from "next"

import { LoginScreen } from "@/components/login-screen"

export const metadata: Metadata = {
  title: "Login | Dinheirizz",
  description: "Acesse o Dinheirizz com Google ou Apple usando Supabase Auth.",
}

export default function LoginPage() {
  return <LoginScreen />
}