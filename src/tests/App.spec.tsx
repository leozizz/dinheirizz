import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App Component (Dinheirizz 2.0 Frontend)', () => {
  it('deve renderizar a tela de Boas-Vindas inicialmente quando deslogado', () => {
    render(<App />)
    expect(screen.getByText(/dinheirizz 2\.0 pwa/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /controle financeiro inteligente/i })).toBeInTheDocument()
    expect(screen.getByTestId('welcome-login-btn')).toBeInTheDocument()
    expect(screen.getByTestId('welcome-demo-btn')).toBeInTheDocument()
  })

  it('deve navegar para a tela de Login ao clicar em Acessar minha conta', () => {
    render(<App />)
    const loginBtn = screen.getByTestId('welcome-login-btn')
    fireEvent.click(loginBtn)

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
  })

  it('deve abrir o Dashboard em modo demonstração ao clicar em Explorar modo demonstração', () => {
    render(<App />)
    const demoBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    expect(screen.getByText(/modo de demonstração/i)).toBeInTheDocument()
    expect(screen.getByText(/saldo total/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 14\.850,20/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /receita/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /despesa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transferir/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /pix/i }).length).toBeGreaterThanOrEqual(1)
  })
})
