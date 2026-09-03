import { Hono } from 'hono'
import { getDb } from '../db/client'
import { categories } from '../db/schema'
import { eq } from 'drizzle-orm'

export const categoriesRouter = new Hono()

// Default categories when DB is not populated yet or during mock
export const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#fb923c' },
  { id: '2', name: 'Transporte', type: 'expense', icon: 'car', color: '#60a5fa' },
  { id: '3', name: 'Lazer', type: 'expense', icon: 'tv', color: '#a78bfa' },
  { id: '4', name: 'Contas Fixas', type: 'expense', icon: 'file-text', color: '#fbbf24' },
  { id: '5', name: 'Salário / Proventos', type: 'income', icon: 'banknote', color: '#34d399' }
]

categoriesRouter.get('/', async (c) => {
  const db = getDb()
  if (!db) {
    return c.json({ data: DEFAULT_CATEGORIES, count: DEFAULT_CATEGORIES.length })
  }

  try {
    const userId = c.req.query('user_id')
    let result
    if (userId) {
      result = await db.select().from(categories).where(eq(categories.userId, userId))
    } else {
      result = await db.select().from(categories).limit(50)
    }
    return c.json({ data: result.length > 0 ? result : DEFAULT_CATEGORIES, count: result.length })
  } catch (error) {
    return c.json({ data: DEFAULT_CATEGORIES, count: DEFAULT_CATEGORIES.length })
  }
})
