import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRouter } from './src/routes/health'
import { categoriesRouter } from './src/routes/categories'
import { transactionsRouter } from './src/routes/transactions'

export const app = new Hono().basePath('/api')

// Global Middlewares
app.use('*', cors())

// Global Error Handler
app.onError((err, c) => {
  return c.json({ error: 'Erro interno no servidor', message: err.message }, 500)
})

// Mount routers
app.route('/health', healthRouter)
app.route('/v1/categories', categoriesRouter)
app.route('/v1/transactions', transactionsRouter)

export default app
