import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '../..')
const publicDir = path.join(rootDir, 'public')
const viteConfigPath = path.join(rootDir, 'vite.config.ts')
const indexHtmlPath = path.join(rootDir, 'index.html')

describe('PWA Manifest, Icons & Build Configuration (Issue #68)', () => {
  it('não deve manter o arquivo legado public/manifest.json', () => {
    const legacyManifestPath = path.join(publicDir, 'manifest.json')
    expect(fs.existsSync(legacyManifestPath)).toBe(false)
  })

  it('deve possuir fisicamente em public/ todos os ícones PWA e favicons declarados', () => {
    const requiredIcons = [
      'icon-192x192.png',
      'icon-512x512.png',
      'icon-maskable-512x512.png',
      'apple-touch-icon.png',
      'icon.svg',
      'icon-dark-32x32.png',
      'icon-light-32x32.png'
    ]

    requiredIcons.forEach((iconFile) => {
      const iconPath = path.join(publicDir, iconFile)
      expect(fs.existsSync(iconPath), `Ícone ausente: public/${iconFile}`).toBe(true)
      const stats = fs.statSync(iconPath)
      expect(stats.size, `Ícone vazio: public/${iconFile}`).toBeGreaterThan(0)
    })
  })

  it('vite.config.ts não deve conter referências legadas e deve configurar registerType prompt e workbox seguro', () => {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8')

    expect(viteConfig).not.toContain('FinanceFlow')
    expect(viteConfig).not.toContain('#1a1625')
    expect(viteConfig).not.toContain('/favicon.ico')
    expect(viteConfig).not.toContain("'/icon-192.png'")
    expect(viteConfig).not.toContain("'/icon-512.png'")

    expect(viteConfig).toContain("registerType: 'prompt'")
    expect(viteConfig).toContain("importScripts: ['/sw-push.js']")
    expect(viteConfig).toContain('cleanupOutdatedCaches: true')
    expect(viteConfig).toContain('navigateFallbackDenylist')
    expect(viteConfig).toContain("theme_color: '#0d0e12'")
    expect(viteConfig).toContain("background_color: '#0d0e12'")
    expect(viteConfig).toContain("lang: 'pt-BR'")
    expect(viteConfig).toContain('/icon-192x192.png')
    expect(viteConfig).toContain('/icon-512x512.png')
    expect(viteConfig).toContain('/icon-maskable-512x512.png')
  })

  it('index.html não deve conter referências legadas e deve declarar favicons e theme-color dual-theme', () => {
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')

    expect(indexHtml).not.toContain('FinanceFlow')
    expect(indexHtml).not.toContain('#1a1625')
    expect(indexHtml).not.toContain('/favicon.ico')

    expect(indexHtml).toContain('href="/icon.svg"')
    expect(indexHtml).toContain('href="/icon-dark-32x32.png"')
    expect(indexHtml).toContain('href="/icon-light-32x32.png"')
    expect(indexHtml).toContain('href="/apple-touch-icon.png"')
    expect(indexHtml).toContain('content="#0d0e12"')
    expect(indexHtml).toContain('content="#f9fafb"')
    expect(indexHtml).toContain('(prefers-color-scheme: dark)')
    expect(indexHtml).toContain('(prefers-color-scheme: light)')
  })
})
