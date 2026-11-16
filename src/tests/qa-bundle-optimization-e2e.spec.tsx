import React, { Suspense } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { ModalSuspenseFallback } from '../components/ui/ModalSuspenseFallback'

describe('QA Suite — Validação E2E de Otimização de Bundle, Dynamic Imports e Acessibilidade (LEO-57)', () => {
  describe('Critério 1: Limite Rigoroso de Tamanho de Bundle (< 350 kB)', () => {
    it('deve confirmar que os artefatos de build gerados no dist/ respeitam o teto de 350 kB', () => {
      const distAssetsDir = path.resolve(process.cwd(), 'dist/assets')
      expect(fs.existsSync(distAssetsDir)).toBe(true)

      const files = fs.readdirSync(distAssetsDir)
      const jsFiles = files.filter((f) => f.endsWith('.js'))

      expect(jsFiles.length).toBeGreaterThan(0)

      // Localiza o chunk de entrada principal (index-*.js)
      const indexEntryFile = jsFiles.find((f) => f.startsWith('index-') && !f.includes('css'))
      expect(indexEntryFile).toBeDefined()

      const entryStats = fs.statSync(path.join(distAssetsDir, indexEntryFile!))
      const entrySizeKb = entryStats.size / 1024

      // Critério de Aceite da Demanda: Bundle inicial < 350 kB
      expect(entrySizeKb).toBeLessThan(350)
      // Verificação de alta performance: na prática alcançou ~124 kB
      expect(entrySizeKb).toBeLessThan(200)

      // Valida que nenhum chunk isolado de vendor excede 350 kB
      for (const jsFile of jsFiles) {
        const stats = fs.statSync(path.join(distAssetsDir, jsFile))
        const sizeKb = stats.size / 1024
        expect(sizeKb).toBeLessThan(350)
      }
    })

    it('deve validar que chunks específicos foram gerados para os modais pesados via code-splitting', () => {
      const distAssetsDir = path.resolve(process.cwd(), 'dist/assets')
      const files = fs.readdirSync(distAssetsDir)

      const hasModalChunk = (name: string) => files.some((f) => f.startsWith(name) && f.endsWith('.js'))

      expect(hasModalChunk('TransactionModal')).toBe(true)
      expect(hasModalChunk('ImportStatementModal')).toBe(true)
      expect(hasModalChunk('DangerZoneModal')).toBe(true)
      expect(hasModalChunk('PixWalletModal')).toBe(true)
      expect(hasModalChunk('ProfileModal')).toBe(true)
      expect(hasModalChunk('BudgetModal')).toBe(true)
      expect(hasModalChunk('LoginScreen')).toBe(true)
      expect(hasModalChunk('WelcomeScreen')).toBe(true)
    })
  })

  describe('Critério 2: Acessibilidade WCAG 2.1/2.2 AA do Fallback de Suspense', () => {
    it('deve possuir atributos semânticos role="status", aria-live="polite" e data-testid obrigatório', () => {
      render(<ModalSuspenseFallback />)

      const fallback = screen.getByTestId('modal-loading-fallback')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveAttribute('role', 'status')
      expect(fallback).toHaveAttribute('aria-live', 'polite')

      // Valida presença de texto acessível visível e screen-reader text
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
      expect(screen.getByText('Aguarde, carregando conteúdo')).toBeInTheDocument()
      expect(screen.getByText('Aguarde, carregando conteúdo')).toHaveClass('sr-only')
    })

    it('deve suportar mensagens dinâmicas mantendo acessibilidade', () => {
      const customMessage = 'Carregando módulo de extratos bancários...'
      render(<ModalSuspenseFallback message={customMessage} />)

      expect(screen.getByText(customMessage)).toBeInTheDocument()
      const fallback = screen.getByTestId('modal-loading-fallback')
      expect(fallback).toHaveAttribute('role', 'status')
    })
  })

  describe('Critério 3: Transição Suave e Ausência de Quebras com React.lazy e Suspense', () => {
    it('deve transicionar com sucesso do fallback acessível para o conteúdo final assíncrono', async () => {
      let resolvePromise: (value: { default: React.ComponentType }) => void

      const AsyncComponent = React.lazy(
        () =>
          new Promise<{ default: React.ComponentType }>((resolve) => {
            resolvePromise = resolve
          })
      )

      const TargetComponent = () => (
        <div data-testid="async-loaded-view" className="p-4 bg-card text-foreground">
          <h2>Módulo Financeiro Ativo</h2>
        </div>
      )

      render(
        <Suspense fallback={<ModalSuspenseFallback message="Sincronizando módulo..." />}>
          <AsyncComponent />
        </Suspense>
      )

      // Fallback visível durante carregamento inicial
      expect(screen.getByTestId('modal-loading-fallback')).toBeInTheDocument()
      expect(screen.getByText('Sincronizando módulo...')).toBeInTheDocument()

      // Resolução do Dynamic Import
      resolvePromise!({ default: TargetComponent })

      // Confirmação de que o conteúdo final foi renderizado e o fallback desmontado
      await waitFor(() => {
        expect(screen.getByTestId('async-loaded-view')).toBeInTheDocument()
        expect(screen.queryByTestId('modal-loading-fallback')).not.toBeInTheDocument()
      })
    })
  })

  describe('Critério 4: Gate Anti-Slop, Tokens de Design e Zero !important', () => {
    it('deve utilizar classes Tailwind e tokens semânticos sem estilizações inline agressivas', () => {
      const { container } = render(<ModalSuspenseFallback />)
      const element = container.querySelector('[data-testid="modal-loading-fallback"]')

      expect(element).not.toBeNull()
      const htmlString = element?.outerHTML || ''

      // Proibido !important em CSS inline
      expect(htmlString).not.toContain('!important')

      // Presença de tokens semânticos de tema
      expect(element?.className).toContain('bg-background')
      expect(container.querySelector('.bg-card')).toBeInTheDocument()
      expect(container.querySelector('.text-foreground')).toBeInTheDocument()
      expect(container.querySelector('.text-primary')).toBeInTheDocument()
    })
  })
})
