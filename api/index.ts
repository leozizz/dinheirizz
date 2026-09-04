import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRouter } from './src/routes/health'
import { categoriesRouter } from './src/routes/categories'
import { transactionsRouter } from './src/routes/transactions'
import { authMiddleware, type AuthEnv } from './src/middlewares/auth'

export const app = new Hono<AuthEnv>().basePath('/api')

// Global Middlewares
app.use('*', cors())

// Global Error Handler
app.onError((err, c) => {
  return c.json({ error: 'Erro interno no servidor', message: err.message }, 500)
})

// Public Routers
app.route('/health', healthRouter)
app.route('/v1/categories', categoriesRouter)

// Protected Routers (Supabase JWT Bearer required)
app.use('/v1/transactions/*', authMiddleware)
app.use('/v1/transactions', authMiddleware)
app.route('/v1/transactions', transactionsRouter)

export default app

