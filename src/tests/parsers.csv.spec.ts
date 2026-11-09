import { describe, it, expect } from 'vitest'
import { parseCSV } from '../lib/parsers/csv'

describe('parseCSV (TDD)', () => {
  it('deve processar CSV com ponto-e-vírgula e formato brasileiro (ex: Itaú / Bradesco)', () => {
    const csvContent = `Data;Histórico;Docto;Valor;Saldo
10/10/2026;MERCADO EXTRA;123456;-150,50;1.200,00
11/10/2026;SALARIO EMPRESA;987654;4.500,00;5.700,00
12/10/2026;DROGARIA SAO PAULO;554433;-32,80;5.667,20
`
    const result = parseCSV(csvContent, 'extrato-itau.csv')

    expect(result.format).toBe('csv')
    expect(result.fileName).toBe('extrato-itau.csv')
    expect(result.transactions).toHaveLength(3)

    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        date: '2026-10-10',
        description: 'MERCADO EXTRA',
        amount: 150.5,
        type: 'expense',
        selected: true
      })
    )

    expect(result.transactions[1]).toEqual(
      expect.objectContaining({
        date: '2026-10-11',
        description: 'SALARIO EMPRESA',
        amount: 4500,
        type: 'income',
        selected: true
      })
    )

    expect(result.transactions[2]).toEqual(
      expect.objectContaining({
        date: '2026-10-12',
        description: 'DROGARIA SAO PAULO',
        amount: 32.8,
        type: 'expense',
        selected: true
      })
    )

    expect(result.totalIncome).toBe(4500)
    expect(result.totalExpense).toBe(183.3)
  })

  it('deve processar CSV com vírgula e formato internacional ou padrão Nubank', () => {
    const csvNubank = `date,title,amount
2026-10-05,Restaurante Paris,85.00
2026-10-06,Transferência enviada,-200.00
2026-10-07,Depósito recebido,500.00
`
    const result = parseCSV(csvNubank, 'nubank.csv')
    expect(result.transactions).toHaveLength(3)

    // In Nubank credit card CSV, amounts are positive for purchases (expense), or if signed:
    // If amount is negative, expense. Here 85.00 might be positive or negative depending on export.
    // In our parser: if raw value is negative -> expense; if positive and titled 'enviada' or just standard positive:
    // When signed: negative is expense, positive is income.
    expect(result.transactions[1]).toEqual(
      expect.objectContaining({
        date: '2026-10-06',
        description: 'Transferência enviada',
        amount: 200,
        type: 'expense'
      })
    )
    expect(result.transactions[2]).toEqual(
      expect.objectContaining({
        date: '2026-10-07',
        description: 'Depósito recebido',
        amount: 500,
        type: 'income'
      })
    )
  })

  it('deve processar CSV separado por tabulações (TSV) e com parênteses para negativos', () => {
    const tsvContent = `Data\tDescrição\tValor\n15/10/2026\tConta de Luz\t(120,40)\n16/10/2026\tConsultoria\t1.250,00`
    const result = parseCSV(tsvContent, 'extrato.tsv')

    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        date: '2026-10-15',
        description: 'Conta de Luz',
        amount: 120.4,
        type: 'expense'
      })
    )
    expect(result.transactions[1]).toEqual(
      expect.objectContaining({
        date: '2026-10-16',
        description: 'Consultoria',
        amount: 1250,
        type: 'income'
      })
    )
  })

  it('deve descartar linhas vazias e rodapés de extrato bancário', () => {
    const csvWithFooter = `
Data;Descrição;Valor

01/10/2026;Padaria Real;-15,00
02/10/2026;Supermercado;-95,50

Saldo Final: R$ 1.500,00
Extrato emitido em 03/10/2026
`
    const result = parseCSV(csvWithFooter, 'extrato-com-rodape.csv')
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0].description).toBe('Padaria Real')
    expect(result.transactions[1].description).toBe('Supermercado')
  })
})
