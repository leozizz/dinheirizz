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

  it('deve abrir modal de Nova Conta e permitir cadastrar nova conta no modo demo', async () => {
    render(<App />)
    const demoBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    const novaContaBtn = screen.getByRole('button', { name: /Nova Conta/i })
    fireEvent.click(novaContaBtn)

    expect(screen.getByText('Cadastre uma conta corrente, carteira ou investimento')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText(/Ex: Nubank Principal/i)
    fireEvent.change(nameInput, { target: { value: 'C6 Bank PJ' } })

    const balanceInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(balanceInput, { target: { value: '2500,00' } })

    const submitBtn = screen.getByRole('button', { name: /Salvar Conta/i })
    fireEvent.submit(submitBtn.closest('form')!)

    expect(await screen.findByText('C6 Bank PJ')).toBeInTheDocument()
  })

  it('deve abrir modal de Transferência com contas de origem e destino no modo demo', async () => {
    render(<App />)
    const demoBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    const transferBtn = screen.getByRole('button', { name: /transferir/i })
    fireEvent.click(transferBtn)

    expect(screen.getByText('Transferência entre Contas')).toBeInTheDocument()
    expect(screen.getByText('Conta de Origem')).toBeInTheDocument()
    expect(screen.getByText('Conta de Destino')).toBeInTheDocument()
  })

  it('deve atualizar o saldo total ao registrar uma despesa ou receita no modo demo', async () => {
    render(<App />)
    const demoBtn = screen.getByTestId('welcome-demo-btn')
    fireEvent.click(demoBtn)

    expect(screen.getByText(/R\$ 14\.850,20/i)).toBeInTheDocument()

    // Abre modal de despesa
    const despesaBtn = screen.getByRole('button', { name: /despesa/i })
    fireEvent.click(despesaBtn)

    const amountInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(amountInput, { target: { value: '850,20' } })

    const submitBtn = screen.getByTestId('transaction-submit-btn')
    fireEvent.click(submitBtn)

    // O saldo anterior era 14.850,20 - 850,20 = 14.000,00
    expect(await screen.findByText(/R\$ 14\.000,00/i)).toBeInTheDocument()
  })
})

