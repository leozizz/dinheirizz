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
