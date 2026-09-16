import { describe, it, expect } from 'vitest'
import { formatTransactionDate, formatBRL, parseCurrencyToNumber } from '../lib/formatters'

describe('formatters (TDD)', () => {
  describe('formatTransactionDate', () => {
    it('formata strings ISO e datas sem retroceder o dia por fuso horário', () => {
      // Simula uma data ISO UTC meia-noite que em UTC-3 costumava cair no dia 14
      const formattedUtc = formatTransactionDate('2026-09-15T00:00:00.000Z')
      expect(formattedUtc).toMatch(/15 de set/i)

      const formattedDateOnly = formatTransactionDate('2026-09-15')
      expect(formattedDateOnly).toMatch(/15 de set/i)
    })

    it('retorna string vazia para data inválida', () => {
      expect(formatTransactionDate('')).toBe('')
      expect(formatTransactionDate('data-invalida')).toBe('')
    })
  })

  describe('formatBRL', () => {
    it('formata valores numéricos e strings como BRL', () => {
      expect(formatBRL(1500.5)).toMatch(/R\$\s*1\.500,50/)
      expect(formatBRL('250.00')).toMatch(/R\$\s*250,00/)
      expect(formatBRL(0)).toMatch(/R\$\s*0,00/)
    })
  })

  describe('parseCurrencyToNumber', () => {
    it('converte valores com vírgula e ponto corretamente', () => {
      expect(parseCurrencyToNumber('150,50')).toBe(150.5)
      expect(parseCurrencyToNumber('1.250,75')).toBe(1250.75)
      expect(parseCurrencyToNumber('250.50')).toBe(250.5)
    })
  })
})
