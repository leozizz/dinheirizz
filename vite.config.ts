import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Plugin para executar o BFF HonoJS diretamente no Vite Dev Server
function honoDevServerPlugin(): Plugin {
  return {
    name: 'hono-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next()
        }

        try {
          const { app } = await server.ssrLoadModule('/api/index.ts')

          const protocol = req.headers['x-forwarded-proto'] || 'http'
          const host = req.headers.host || 'localhost:3000'
          const fullUrl = new URL(req.url, `${protocol}://${host}`)

          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) {
              if (Array.isArray(value)) {
                value.forEach((v) => headers.append(key, v))
              } else {
                headers.set(key, value)
              }
            }
          }

          const method = req.method || 'GET'
          let body: Uint8Array | undefined = undefined
          if (!['GET', 'HEAD'].includes(method)) {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
            }
            body = new Uint8Array(Buffer.concat(chunks))
          }

          const webRequest = new Request(fullUrl.toString(), {
            method,
            headers,
            body
          })

          const response = await app.fetch(webRequest, process.env)

          res.statusCode = response.status
          response.headers.forEach((v: string, k: string) => {
            res.setHeader(k, v)
          })

          if (response.body) {
            const reader = response.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (err) {
          next(err)
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value
    }
  }

  return {
  plugins: [
    honoDevServerPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dinheirizz 2.0',
        short_name: 'Dinheirizz',
        description: 'Controle Financeiro PWA Inteligente e Elegante',
        theme_color: '#1a1625',
        background_color: '#1a1625',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  },
  server: {
    port: 3000
  }
}
})
