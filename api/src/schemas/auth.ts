import { z } from 'zod'

export const syncUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Username inválido')
    .optional(),
  avatarUrl: z.string().url().optional(),
  provider: z.enum(['email', 'google', 'apple']).default('email').optional(),
})

export const signupSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  fullName: z.string().trim().min(1, 'Nome completo é obrigatório').optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Nome de usuário deve ter entre 3 e 20 caracteres (apenas letras, números e sublinhados)')
    .optional(),
})

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginInput = z.infer<typeof loginSchema>
