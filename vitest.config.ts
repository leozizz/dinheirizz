import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts', './api/tests/setup.ts'],
    include: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'virtual:pwa-register/react': path.resolve(__dirname, './src/tests/mocks/pwaRegisterReact.ts')
    }
  }
})
