import { describe, it, expect } from 'vitest'
import { detectBank } from '../lib/banks'

describe('detectBank Helper (TDD)', () => {
  it('detecta Nubank por nome ou palavras-chave', () => {
    const bank = detectBank('Nubank Principal')
    expect(bank.slug).toBe('nubank')
    expect(bank.name).toBe('Nubank')
    expect(bank.primaryColor).toBe('#820ad1')
  })

  it('detecta Itaú por nome ou acentuação', () => {
    const bank1 = detectBank('Itaú Reserva')
    expect(bank1.slug).toBe('itau')
    expect(bank1.name).toBe('Itaú')

    const bank2 = detectBank('itau personnalite')
    expect(bank2.slug).toBe('itau')
  })

  it('detecta outros bancos brasileiros conhecidos (Bradesco, Santander, Banco do Brasil, Inter, C6, Agibank, Caixa)', () => {
    expect(detectBank('Bradesco Prime').slug).toBe('bradesco')
    expect(detectBank('Santander Select').slug).toBe('santander')
    expect(detectBank('Banco do Brasil').slug).toBe('bb')
    expect(detectBank('Inter PJ').slug).toBe('inter')
    expect(detectBank('C6 Bank').slug).toBe('c6')
    expect(detectBank('Agibank').slug).toBe('agibank')
    expect(detectBank('Caixa Econômica Federal').slug).toBe('caixa')
    expect(detectBank('BTG Pactual Investimentos').slug).toBe('btg')
  })

  it('retorna fallback genérico para banco desconhecido ou vazio', () => {
    const fallback = detectBank('Carteira Física')
    expect(fallback.slug).toBe('generic')
    expect(fallback.name).toBe('Instituição')
    expect(fallback.initials).toBe('CF')

    const empty = detectBank('')
    expect(empty.slug).toBe('generic')
    expect(empty.initials).toBe('B')
  })
})
