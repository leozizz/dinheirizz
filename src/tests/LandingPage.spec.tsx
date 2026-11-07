import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { WelcomeScreen } from '../components/auth/WelcomeScreen'

describe('Landing Page Institucional (WelcomeScreen & Submódulos)', () => {
  it('deve renderizar a estrutura completa com Header, Hero, Showcase, Segurança e Footer', () => {
    const handleLogin = vi.fn()
    const handleDemo = vi.fn()

    render(<WelcomeScreen onGoToLogin={handleLogin} onExploreDemo={handleDemo} />)

    // Header institucional
    expect(screen.getByTestId('welcome-header-login-btn')).toBeInTheDocument()
    expect(screen.getAllByText('Dinheirizz').length).toBeGreaterThanOrEqual(1)

    // Hero Section
    expect(screen.getByRole('heading', { name: /controle financeiro inteligente/i })).toBeInTheDocument()
    expect(screen.getByTestId('welcome-login-btn')).toBeInTheDocument()
    expect(screen.getByTestId('welcome-demo-btn')).toBeInTheDocument()
    expect(screen.getByTestId('welcome-pwa-btn')).toBeInTheDocument()

    // Showcase de Recursos
    expect(screen.getByTestId('landing-showcase')).toBeInTheDocument()
    expect(screen.getByTestId('landing-tab-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('landing-tab-pix')).toBeInTheDocument()
    expect(screen.getByTestId('landing-tab-ai')).toBeInTheDocument()
    expect(screen.getByTestId('landing-tab-transactions')).toBeInTheDocument()

    // Seção de Tecnologia e Segurança
    expect(screen.getByTestId('landing-security')).toBeInTheDocument()
    expect(screen.getByText(/Supabase Cloud/i)).toBeInTheDocument()
    expect(screen.getByText(/Cloudflare Pages & Edge/i)).toBeInTheDocument()
    expect(screen.getByText(/Criptografia em Repouso/i)).toBeInTheDocument()
    expect(screen.getByText(/PWA Nativo/i)).toBeInTheDocument()

    // Rodapé Institucional
    expect(screen.getByTestId('landing-footer')).toBeInTheDocument()
    expect(screen.getByTestId('landing-system-status')).toBeInTheDocument()
    expect(screen.getByText(/v2\.0\.0/i)).toBeInTheDocument()
  })

  it('deve disparar os callbacks onGoToLogin e onExploreDemo nos botões correspondentes', () => {
    const handleLogin = vi.fn()
    const handleDemo = vi.fn()

    render(<WelcomeScreen onGoToLogin={handleLogin} onExploreDemo={handleDemo} />)

    // Clique no botão do Hero "Acessar minha conta"
    fireEvent.click(screen.getByTestId('welcome-login-btn'))
    expect(handleLogin).toHaveBeenCalledTimes(1)

    // Clique no botão do Header "Entrar"
    fireEvent.click(screen.getByTestId('welcome-header-login-btn'))
    expect(handleLogin).toHaveBeenCalledTimes(2)

    // Clique no botão do Hero "Explorar modo demonstração"
    fireEvent.click(screen.getByTestId('welcome-demo-btn'))
    expect(handleDemo).toHaveBeenCalledTimes(1)
  })

  it('deve alternar dinamicamente o conteúdo ao clicar nas abas do Showcase de Recursos', () => {
    render(<WelcomeScreen onGoToLogin={vi.fn()} onExploreDemo={vi.fn()} />)

    const showcaseContainer = screen.getByTestId('landing-showcase')

    // Aba inicial: Dashboard & Calendário
    expect(within(showcaseContainer).getByText(/Visão consolidada de receitas e despesas/i)).toBeInTheDocument()

    // Clica na aba Carteira Pix
    fireEvent.click(screen.getByTestId('landing-tab-pix'))
    expect(within(showcaseContainer).getByText(/Carteira Pix & Chaves/i)).toBeInTheDocument()
    expect(within(showcaseContainer).getAllByText(/Criptografia client-side/i).length).toBeGreaterThanOrEqual(1)

    // Clica na aba Inteligência Artificial
    fireEvent.click(screen.getByTestId('landing-tab-ai'))
    expect(within(showcaseContainer).getByText(/Inteligência Financeira com IA/i)).toBeInTheDocument()
    expect(within(showcaseContainer).getAllByText(/Análises preditivas/i).length).toBeGreaterThanOrEqual(1)

    // Clica na aba Gestão de Transações
    fireEvent.click(screen.getByTestId('landing-tab-transactions'))
    expect(within(showcaseContainer).getByText(/Orçamentos por Envelopes & Categorias/i)).toBeInTheDocument()

    // Volta para Dashboard
    fireEvent.click(screen.getByTestId('landing-tab-dashboard'))
    expect(within(showcaseContainer).getByText(/Dashboard & Calendário Financeiro/i)).toBeInTheDocument()
  })

  it('deve garantir que todos os botões e seletores possuam data-testid e touch targets adequados', () => {
    render(<WelcomeScreen onGoToLogin={vi.fn()} onExploreDemo={vi.fn()} />)

    const buttons = [
      screen.getByTestId('welcome-header-login-btn'),
      screen.getByTestId('welcome-login-btn'),
      screen.getByTestId('welcome-demo-btn'),
      screen.getByTestId('welcome-pwa-btn'),
      screen.getByTestId('landing-tab-dashboard'),
      screen.getByTestId('landing-tab-pix'),
      screen.getByTestId('landing-tab-ai'),
      screen.getByTestId('landing-tab-transactions'),
    ]

    buttons.forEach((btn) => {
      expect(btn).toBeInTheDocument()
      // Verifica classes de touch target mínimo (h-11, min-h-[44px], py-3 etc)
      expect(btn.className).toMatch(/(min-h-\[44px\]|min-h-\[48px\]|h-11|py-)/)
    })
  })
})
