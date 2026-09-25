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
import { authMiddleware, type AuthEnv } from './src/middlewares/auth'

export const app = new Hono<AuthEnv>().basePath('/api')

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

export default app


