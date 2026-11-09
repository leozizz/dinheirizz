import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '../middlewares/auth'

export const suggestCategoriesSchema = z.object({
  descriptions: z.array(z.string().min(1)).min(1, 'Ao menos uma descrição deve ser informada'),
  availableCategories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['income', 'expense'])
    })
  )
})

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

interface HeuristicRule {
  keywords: string[]
  matchCategoryPatterns: string[]
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    keywords: ['IFOOD', 'RESTAURANTE', 'PADARIA', 'MERCADO', 'SUPERMERCADO', 'LANCHONETE', 'BURGER', 'PIZZA', 'CAFE'],
    matchCategoryPatterns: ['ALIMENTACAO', 'ALIMENTAÇÃO', 'REFEICAO', 'REFEIÇÃO']
  },
  {
    keywords: ['UBER', '99APP', '99 POP', '99 TAXI', 'POSTO', 'SHELL', 'IPIRANGA', 'PETROBRAS', 'GASOLINA', 'COMBUSTIVEL'],
    matchCategoryPatterns: ['TRANSPORTE', 'VEICULO', 'COMBUSTIVEL']
  },
  {
    keywords: ['DROGASIL', 'RAIA', 'DROGARIA', 'FARMACIA', 'FARMÁCIA', 'PAGUE MENOS', 'HOSPITAL', 'MEDICO'],
    matchCategoryPatterns: ['SAUDE', 'SAÚDE', 'FARMACIA', 'FARMÁCIA']
  },
  {
    keywords: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'YOUTUBE', 'DISNEY', 'APPLE', 'GOOGLE'],
    matchCategoryPatterns: ['ASSINATURAS & SERVICOS', 'SERVICOS', 'ASSINATURAS', 'LAZER']
  },
  {
    keywords: ['CONDOMINIO', 'ENEL', 'SABESP', 'CPFL', 'LUZ', 'AGUA', 'GAS', 'ALUGUEL'],
    matchCategoryPatterns: ['MORADIA', 'CASA', 'CONTAS']
  },
  {
    keywords: ['SALARIO', 'SALÁRIO', 'PAGTO SALARIO', 'REMUNERACAO', 'FOLHA', 'TED SALARIO'],
    matchCategoryPatterns: ['SALARIO', 'SALÁRIO', 'RENDA']
  }
]

export const importRouter = new Hono<AuthEnv>()

importRouter.post('/suggest-categories', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400)
  }

  const result = suggestCategoriesSchema.safeParse(body)
  if (!result.success) {
    return c.json(
      {
        error: 'Dados inválidos',
        details: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      },
      400
    )
  }

  const { descriptions, availableCategories } = result.data

  const normalizedCategories = availableCategories.map((cat) => ({
    ...cat,
    normalizedName: normalizeText(cat.name)
  }))

  const suggestions = descriptions.map((desc) => {
    const normDesc = normalizeText(desc)

    for (const rule of HEURISTIC_RULES) {
      const matchFound = rule.keywords.some((kw) => normDesc.includes(kw))
      if (matchFound) {
        const cat = normalizedCategories.find((nc) =>
          rule.matchCategoryPatterns.some((pattern) => nc.normalizedName.includes(pattern))
        )
        if (cat) {
          return {
            description: desc,
            categoryId: cat.id,
            categoryName: cat.name,
            confidence: 0.95,
            source: 'rule' as const
          }
        }
      }
    }

    return {
      description: desc,
      categoryId: null,
      categoryName: null,
      confidence: 0,
      source: 'rule' as const
    }
  })

  return c.json({ suggestions }, 200)
})
