import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { formatBRL } from '../lib/formatters'

describe('AnimatedNumber Component (TDD)', () => {
  it('deve renderizar o valor inicial formatado com formatBRL', () => {
    render(<AnimatedNumber value={12450.75} formatter={formatBRL} />)
    expect(screen.getByText('R$ 12.450,75')).toBeInTheDocument()
  })

  it('deve utilizar formatação padrão quando nenhum formatter for fornecido', () => {
    render(<AnimatedNumber value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('deve atualizar o valor exibido quando a prop value mudar', () => {
    const { rerender } = render(<AnimatedNumber value={500} />)
    expect(screen.getByText('500')).toBeInTheDocument()

    rerender(<AnimatedNumber value={1200} />)
    expect(screen.getByText('1200')).toBeInTheDocument()
  })

  it('deve aceitar className customizada e repassar para o elemento', () => {
    render(
      <AnimatedNumber
        value={250.5}
        formatter={formatBRL}
        className="text-2xl font-bold text-primary"
      />
    )
    const element = screen.getByText('R$ 250,50')
    expect(element).toHaveClass('text-2xl', 'font-bold', 'text-primary')
  })
})
