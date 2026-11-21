import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Plugin para executar o BFF HonoJS diretamente no Vite Dev Server
const honoDevServerPlugin = (): Plugin => {
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
        registerType: 'prompt',
        includeAssets: [
          'dinheirizz-dark/favicon.ico',
          'dinheirizz-dark/favicon-16x16.png',
          'dinheirizz-dark/favicon-32x32.png',
          'dinheirizz-dark/apple-touch-icon.png',
          'dinheirizz-light/favicon.ico',
          'dinheirizz-light/favicon-16x16.png',
          'dinheirizz-light/favicon-32x32.png',
          'dinheirizz-light/apple-touch-icon.png'
        ],
        workbox: {
          importScripts: ['/sw-push.js'],
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//]
        },
        manifest: {
          name: 'Dinheirizz',
          short_name: 'Dinheirizz',
          description: 'Controle Financeiro PWA Inteligente e Elegante',
          id: '/',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'pt-BR',
          theme_color: '#0d0e12',
          background_color: '#0d0e12',
          icons: [
            {
              src: '/dinheirizz-dark/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/dinheirizz-dark/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/dinheirizz-dark/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
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
    build: {
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const normalizedId = id.replace(/\\/g, '/')
            if (!normalizedId.includes('/node_modules/')) {
              return undefined
            }

            if (
              normalizedId.includes('/react/') ||
              normalizedId.includes('/react-dom/') ||
              normalizedId.includes('/scheduler/')
            ) {
              return 'vendor-react'
            }

            if (normalizedId.includes('/@tanstack/react-query/')) {
              return 'vendor-query'
            }

            if (normalizedId.includes('/@supabase/')) {
              return 'vendor-supabase'
            }

            if (
              normalizedId.includes('/@radix-ui/') ||
              normalizedId.includes('/framer-motion/') ||
              normalizedId.includes('/vaul/') ||
              normalizedId.includes('/cmdk/') ||
              normalizedId.includes('/sonner/')
            ) {
              return 'vendor-ui'
            }

            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-icons'
            }

            if (
              normalizedId.includes('/react-hook-form/') ||
              normalizedId.includes('/@hookform/') ||
              normalizedId.includes('/zod/')
            ) {
              return 'vendor-forms'
            }

            if (
              normalizedId.includes('/date-fns/') ||
              normalizedId.includes('/react-day-picker/') ||
              normalizedId.includes('/clsx/') ||
              normalizedId.includes('/tailwind-merge/') ||
              normalizedId.includes('/class-variance-authority/')
            ) {
              return 'vendor-utils'
            }

            if (
              normalizedId.includes('/recharts/') ||
              normalizedId.includes('/d3-') ||
              normalizedId.includes('/victory-vendor/')
            ) {
              return 'vendor-charts'
            }

            return undefined
          }
        }
      }
    },
    server: {
      port: 3000
    }
  }
})
