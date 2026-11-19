import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '../..')
const publicDir = path.join(rootDir, 'public')
const viteConfigPath = path.join(rootDir, 'vite.config.ts')
const indexHtmlPath = path.join(rootDir, 'index.html')
const swPushPath = path.join(publicDir, 'sw-push.js')
const apiPushPath = path.join(rootDir, 'api/src/routes/push.ts')

const LEGACY_PUBLIC_FILES = [
  'apple-icon.png',
  'apple-touch-icon.png',
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-dark-32x32.png',
  'icon-light-32x32.png',
  'icon-maskable-512x512.png',
  'icon.svg',
  'placeholder-logo.png',
  'placeholder-logo.svg',
  'placeholder-user.jpg',
  'placeholder.jpg',
  'placeholder.svg'
]

const OFFICIAL_THEME_ICONS = [
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico'
]

const LEGACY_PATH_FRAGMENTS = [
  '/icon-192',
  '/icon-512',
  '/icon-dark-32x32.png',
  '/icon-light-32x32.png',
  '/icon-maskable-512x512.png',
  '/icon.svg',
  '/apple-icon.png',
  '/placeholder-'
]

describe('PWA Manifest, Icons & Build Configuration (Issue #72)', () => {
  it('não deve manter o arquivo legado public/manifest.json nem os 13 ícones/placeholders legados', () => {
    const legacyManifestPath = path.join(publicDir, 'manifest.json')
    expect(fs.existsSync(legacyManifestPath)).toBe(false)

    LEGACY_PUBLIC_FILES.forEach((legacyFile) => {
      const legacyPath = path.join(publicDir, legacyFile)
      expect(fs.existsSync(legacyPath), `Arquivo legado ainda existe: public/${legacyFile}`).toBe(false)
    })

    const rootEntries = fs.readdirSync(publicDir).sort()
    expect(rootEntries).toEqual(['dinheirizz-dark', 'dinheirizz-light', 'sw-push.js'])
  })

  it('deve possuir fisicamente em public/dinheirizz-dark e public/dinheirizz-light todos os ícones oficiais e sw-push.js', () => {
    expect(fs.existsSync(swPushPath)).toBe(true)

    ;['dinheirizz-dark', 'dinheirizz-light'].forEach((themeDir) => {
      OFFICIAL_THEME_ICONS.forEach((iconFile) => {
        const iconPath = path.join(publicDir, themeDir, iconFile)
        expect(fs.existsSync(iconPath), `Ícone ausente: public/${themeDir}/${iconFile}`).toBe(true)
        const stats = fs.statSync(iconPath)
        expect(stats.size, `Ícone vazio: public/${themeDir}/${iconFile}`).toBeGreaterThan(0)
      })
    })
  })

  it('vite.config.ts não deve conter referências legadas e deve configurar ícones oficiais, registerType prompt e workbox seguro', () => {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8')

    expect(viteConfig).not.toContain('FinanceFlow')
    expect(viteConfig).not.toContain('#1a1625')
    LEGACY_PATH_FRAGMENTS.forEach((fragment) => {
      expect(viteConfig).not.toContain(fragment)
    })
    expect(viteConfig).not.toContain("'icon.svg'")
    expect(viteConfig).not.toContain("'apple-touch-icon.png'")
    expect(viteConfig).not.toContain("'icon-dark-32x32.png'")
    expect(viteConfig).not.toContain("'icon-light-32x32.png'")

    expect(viteConfig).toContain("registerType: 'prompt'")
    expect(viteConfig).toContain("importScripts: ['/sw-push.js']")
    expect(viteConfig).toContain('cleanupOutdatedCaches: true')
    expect(viteConfig).toContain('navigateFallbackDenylist')
    expect(viteConfig).toContain("theme_color: '#0d0e12'")
    expect(viteConfig).toContain("background_color: '#0d0e12'")
    expect(viteConfig).toContain("lang: 'pt-BR'")

    expect(viteConfig).toContain('dinheirizz-dark/favicon.ico')
    expect(viteConfig).toContain('dinheirizz-dark/favicon-16x16.png')
    expect(viteConfig).toContain('dinheirizz-dark/favicon-32x32.png')
    expect(viteConfig).toContain('dinheirizz-dark/apple-touch-icon.png')
    expect(viteConfig).toContain('dinheirizz-light/favicon.ico')
    expect(viteConfig).toContain('dinheirizz-light/favicon-16x16.png')
    expect(viteConfig).toContain('dinheirizz-light/favicon-32x32.png')
    expect(viteConfig).toContain('dinheirizz-light/apple-touch-icon.png')
    expect(viteConfig).toContain('/dinheirizz-dark/android-chrome-192x192.png')
    expect(viteConfig).toContain('/dinheirizz-dark/android-chrome-512x512.png')
  })

  it('index.html não deve conter referências legadas e deve declarar favicons dinâmicos e theme-color dual-theme', () => {
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')

    expect(indexHtml).not.toContain('FinanceFlow')
    expect(indexHtml).not.toContain('#1a1625')
    LEGACY_PATH_FRAGMENTS.forEach((fragment) => {
      expect(indexHtml).not.toContain(fragment)
    })
    expect(indexHtml).not.toContain('href="/apple-touch-icon.png"')

    expect(indexHtml).toContain('href="/dinheirizz-dark/favicon.ico"')
    expect(indexHtml).toContain('href="/dinheirizz-light/favicon.ico"')
    expect(indexHtml).toContain('href="/dinheirizz-dark/favicon-16x16.png"')
    expect(indexHtml).toContain('href="/dinheirizz-light/favicon-16x16.png"')
    expect(indexHtml).toContain('href="/dinheirizz-dark/favicon-32x32.png"')
    expect(indexHtml).toContain('href="/dinheirizz-light/favicon-32x32.png"')
    expect(indexHtml).toContain('href="/dinheirizz-dark/apple-touch-icon.png"')
    expect(indexHtml).toContain('href="/dinheirizz-light/apple-touch-icon.png"')
    expect(indexHtml).toContain('content="#0d0e12"')
    expect(indexHtml).toContain('content="#f9fafb"')
    expect(indexHtml).toContain('(prefers-color-scheme: dark)')
    expect(indexHtml).toContain('(prefers-color-scheme: light)')
  })

  it('public/sw-push.js e api/src/routes/push.ts devem usar exclusivamente os ícones oficiais em dinheirizz-dark', () => {
    const swPush = fs.readFileSync(swPushPath, 'utf-8')
    const apiPush = fs.readFileSync(apiPushPath, 'utf-8')

    LEGACY_PATH_FRAGMENTS.forEach((fragment) => {
      expect(swPush).not.toContain(fragment)
      expect(apiPush).not.toContain(fragment)
    })

    expect(swPush).toContain('/dinheirizz-dark/android-chrome-192x192.png')
    expect(swPush).toContain('/dinheirizz-dark/favicon-32x32.png')
    expect(apiPush).toContain('/dinheirizz-dark/android-chrome-192x192.png')
    expect(apiPush).toContain('/dinheirizz-dark/favicon-32x32.png')
  })
})
