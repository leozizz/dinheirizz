import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRouter } from './src/routes/health'
import { categoriesRouter } from './src/routes/categories'
import { transactionsRouter } from './src/routes/transactions'
import { usersRouter } from './src/routes/users'
import { accountsRouter } from './src/routes/accounts'
import { transfersRouter } from './src/routes/transfers'
import { pixKeysRouter } from './src/routes/pix'
import { authRouter } from './src/routes/auth'
import { userDataRouter } from './src/routes/userData'
import { insightsRouter } from './src/routes/insights'
import { userAiRouter } from './src/routes/userAi'
import { adminRouter } from './src/routes/admin'
import { forecastRouter } from './src/routes/forecast'
import { budgetsRouter } from './src/routes/budgets'
import { importRouter } from './src/routes/import'
import { aiReceiptRouter } from './src/routes/aiReceipt'
import { aiChatRouter } from './src/routes/aiChat'
import { creditCardsRouter } from './src/routes/creditCards'
import { invoicesRouter } from './src/routes/invoices'
import { reportsRouter } from './src/routes/reports'
import { pushRouter } from './src/routes/push'
import { workspacesRouter } from './src/routes/workspaces'
import { goalsRouter } from './src/routes/goals'
import { authMiddleware, type AuthEnv } from './src/middlewares/auth'
import { runWithRuntimeEnv, type RuntimeEnv } from './src/lib/env'
import { closeRequestDb } from './src/db/client'

export const app = new Hono<AuthEnv>().basePath('/api')

// Propaga c.env do runtime (Cloudflare Pages / Workers) para o contexto da requisição
app.use('*', async (c, next) => {
  await runWithRuntimeEnv(c.env as RuntimeEnv | undefined, async () => {
    try {
      await next()
    } finally {
      await closeRequestDb()
    }
  })
})

// Global Middlewares (CORS e Headers de Segurança)
app.use('*', cors())
app.use('*', secureHeaders())

// Global Error Handler
app.onError((err, c) => {
  return c.json({ error: 'Erro interno no servidor', message: err.message }, 500)
})

// Public Routers
app.route('/health', healthRouter)
app.route('/v1/categories', categoriesRouter)

// Auth Router (signup, login, logout são públicos; /me é protegido)
app.use('/v1/auth/me', authMiddleware)
app.route('/v1/auth', authRouter)

// Protected Routers (Bearer required)
app.use('/v1/accounts/*', authMiddleware)
app.use('/v1/accounts', authMiddleware)
app.route('/v1/accounts', accountsRouter)

app.use('/v1/transfers/*', authMiddleware)
app.use('/v1/transfers', authMiddleware)
app.route('/v1/transfers', transfersRouter)

app.use('/v1/pix-keys/*', authMiddleware)
app.use('/v1/pix-keys', authMiddleware)
app.route('/v1/pix-keys', pixKeysRouter)

app.use('/v1/transactions/*', authMiddleware)
app.use('/v1/transactions', authMiddleware)
app.route('/v1/transactions', transactionsRouter)

app.use('/v1/users/me', authMiddleware)
app.use('/v1/users/sync', authMiddleware)
app.route('/v1/users', usersRouter)

app.use('/v1/user-data/*', authMiddleware)
app.use('/v1/user-data', authMiddleware)
app.route('/v1/user-data', userDataRouter)

app.use('/v1/insights/*', authMiddleware)
app.use('/v1/insights', authMiddleware)
app.route('/v1/insights', insightsRouter)

app.use('/v1/user-ai/*', authMiddleware)
app.use('/v1/user-ai', authMiddleware)
app.route('/v1/user-ai', userAiRouter)

app.use('/v1/admin/*', authMiddleware)
app.use('/v1/admin', authMiddleware)
app.route('/v1/admin', adminRouter)

app.use('/v1/forecast/*', authMiddleware)
app.use('/v1/forecast', authMiddleware)
app.route('/v1/forecast', forecastRouter)

app.use('/v1/budgets/*', authMiddleware)
app.use('/v1/budgets', authMiddleware)
app.route('/v1/budgets', budgetsRouter)

app.use('/v1/import/*', authMiddleware)
app.use('/v1/import', authMiddleware)
app.route('/v1/import', importRouter)

app.use('/v1/ai/*', authMiddleware)
app.use('/v1/ai', authMiddleware)
app.route('/v1/ai', aiReceiptRouter)
app.route('/v1/ai', aiChatRouter)

app.use('/v1/credit-cards/*', authMiddleware)
app.use('/v1/credit-cards', authMiddleware)
app.route('/v1/credit-cards', creditCardsRouter)

app.use('/v1/invoices/*', authMiddleware)
app.use('/v1/invoices', authMiddleware)
app.route('/v1/invoices', invoicesRouter)

app.use('/v1/reports/*', authMiddleware)
app.use('/v1/reports', authMiddleware)
app.route('/v1/reports', reportsRouter)

app.use('/v1/push/*', authMiddleware)
app.use('/v1/push', authMiddleware)
app.route('/v1/push', pushRouter)

app.use('/v1/workspaces/*', authMiddleware)
app.use('/v1/workspaces', authMiddleware)
app.route('/v1/workspaces', workspacesRouter)

app.use('/v1/goals/*', authMiddleware)
app.use('/v1/goals', authMiddleware)
app.route('/v1/goals', goalsRouter)

export default app


