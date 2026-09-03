import { handle } from 'hono/cloudflare-pages'
import { app } from '../../api/index'

export const onRequest = handle(app)
