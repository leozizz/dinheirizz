import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component (Dinheirizz 2.0 Frontend)', () => {
  it('deve renderizar o título Dinheirizz e a tag PWA', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /dinheirizz/i })).toBeInTheDocument()
    expect(screen.getByText(/2\.0 PWA/i)).toBeInTheDocument()
  })

  it('deve renderizar o card de saldo principal com valores', () => {
    render(<App />)
    expect(screen.getByText(/saldo total/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 14\.850,20/i)).toBeInTheDocument()
    expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
  })

  it('deve renderizar os botões de ações rápidas', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /receita/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /despesa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transferir/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /pix/i }).length).toBeGreaterThanOrEqual(1)
  })
})
