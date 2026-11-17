import React, { Suspense } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalSuspenseFallback } from '../components/ui/ModalSuspenseFallback'

describe('ModalSuspenseFallback & Lazy Loading Tests', () => {
  it('deve renderizar o fallback com atributos de acessibilidade e data-testid corretos', () => {
    render(<ModalSuspenseFallback />)

    const fallback = screen.getByTestId('modal-loading-fallback')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveAttribute('role', 'status')
    expect(fallback).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('deve renderizar mensagem customizada e classes adicionais', () => {
    render(
      <ModalSuspenseFallback
        message="Preparando leitura de comprovante..."
        className="custom-fallback-class"
      />
    )

    const fallback = screen.getByTestId('modal-loading-fallback')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveClass('custom-fallback-class')
    expect(screen.getByText('Preparando leitura de comprovante...')).toBeInTheDocument()
  })

  it('deve exibir o fallback durante carregamento de componente lazy e depois o componente resolvido', async () => {
    let resolveComponent: (value: { default: React.ComponentType }) => void

    const LazyComponent = React.lazy(() => {
      return new Promise<{ default: React.ComponentType }>((resolve) => {
        resolveComponent = resolve
      })
    })

    const DummyResolved = () => {
      return <div data-testid="resolved-lazy-content">Conteúdo Carregado com Sucesso</div>
    }

    render(
      <Suspense fallback={<ModalSuspenseFallback message="Carregando módulo..." />}>
        <LazyComponent />
      </Suspense>
    )

    // Inicialmente o fallback deve estar visível
    expect(screen.getByTestId('modal-loading-fallback')).toBeInTheDocument()
    expect(screen.getByText('Carregando módulo...')).toBeInTheDocument()

    // Resolve o componente lazy
    resolveComponent!({ default: DummyResolved })

    // Agora o conteúdo resolvido deve estar presente e o fallback removido
    expect(await screen.findByTestId('resolved-lazy-content')).toBeInTheDocument()
    expect(screen.queryByTestId('modal-loading-fallback')).not.toBeInTheDocument()
  })

  it('deve carregar modal assíncrono envelopado em Suspense exibindo fallback e conteúdo final', async () => {
    const LazyModal = React.lazy(
      () =>
        new Promise<{ default: React.ComponentType<{ isOpen: boolean; testId: string }> }>(
          (resolve) => {
            setTimeout(() => {
              resolve({
                default: ({ isOpen, testId }: { isOpen: boolean; testId: string }) =>
                  isOpen ? <div data-testid={testId}>Modal Lazy Renderizado</div> : null
              })
            }, 30)
          }
        )
    )

    render(
      <Suspense fallback={<ModalSuspenseFallback message="Carregando modal..." />}>
        <LazyModal isOpen={true} testId="lazy-modal-content" />
      </Suspense>
    )

    expect(screen.getByTestId('modal-loading-fallback')).toBeInTheDocument()
    expect(await screen.findByTestId('lazy-modal-content')).toBeInTheDocument()
    expect(screen.queryByTestId('modal-loading-fallback')).not.toBeInTheDocument()
  })
})
