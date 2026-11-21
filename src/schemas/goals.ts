import { z } from 'zod'

export const workspaceTypeEnum = z.enum(['personal', 'business'])
export type WorkspaceType = z.infer<typeof workspaceTypeEnum>

export const workspaceFormSchema = z.object({
  name: z
    .string({ required_error: 'Nome do perfil é obrigatório' })
    .trim()
    .min(1, 'Nome do perfil é obrigatório')
    .max(60, 'Nome do perfil deve ter no máximo 60 caracteres'),
  type: workspaceTypeEnum.default('personal'),
  currency: z.string().trim().min(3).max(10).default('BRL'),
  isDefault: z.boolean().default(false)
})

export type WorkspaceFormData = z.infer<typeof workspaceFormSchema>

export const goalFormSchema = z.object({
  name: z
    .string({ required_error: 'Nome da meta é obrigatório' })
    .trim()
    .min(1, 'Nome da meta é obrigatório')
    .max(100, 'Nome da meta deve ter no máximo 100 caracteres'),
  targetAmount: z
    .number({
      required_error: 'Valor alvo é obrigatório',
      invalid_type_error: 'Informe um valor alvo válido'
    })
    .positive('O valor alvo deve ser maior que zero'),
  currentAmount: z
    .number({ invalid_type_error: 'Informe um valor atual válido' })
    .min(0, 'O valor atual não pode ser negativo')
    .default(0),
  deadline: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Prazo inválido' })
    .nullable()
    .optional(),
  profileId: z.string().nullable().optional(),
  icon: z.string().trim().max(50).default('piggy-bank'),
  color: z.string().trim().max(20).default('#7bc816')
})

export type GoalFormData = z.infer<typeof goalFormSchema>

export const contributeGoalSchema = z.object({
  amount: z
    .number({
      required_error: 'Valor do aporte é obrigatório',
      invalid_type_error: 'Informe um valor válido'
    })
    .positive('O valor do aporte deve ser maior que zero')
})

export type ContributeGoalData = z.infer<typeof contributeGoalSchema>
