import { Hono } from 'hono'

export const healthRouter = new Hono()

healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  })
})
