import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock seguro de fetch para testes de frontend no jsdom
global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
  const urlStr = typeof url === 'string' ? url : url.toString()
  if (urlStr.includes('/check-email')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ exists: false })
    } as Response
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({})
  } as Response
})

// Mock padrão de virtual:pwa-register/react para testes unitários/integração no jsdom
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn().mockResolvedValue(undefined)
  })
}))

// Polyfills jsdom necessários para Radix Select / Popover
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}
