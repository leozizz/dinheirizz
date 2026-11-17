import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateTransactionsCSV,
  downloadCSV,
  type ExportTransactionItem
} from '../lib/export/csvGenerator'

describe('csvGenerator (TDD)', () => {
  const sampleTransactions: ExportTransactionItem[] = [
    {
      id: 'tx-1',
      occurredAt: '2026-11-10T12:00:00Z',
      description: 'Salário Mensal',
      type: 'income',
      categoryName: 'Trabalho & Salário',
      accountName: 'Banco do Brasil',
      status: 'completed',
      paidAt: '2026-11-10T12:00:00Z',
      amount: 8500.5,
      notes: 'Referente a Outubro'
    },
    {
      id: 'tx-2',
      occurredAt: '2026-11-12T15:30:00Z',
      description: 'Supermercado; Compra Semanal "Extra"',
      type: 'expense',
      categoryName: 'Alimentação',
      accountName: 'Nubank PF',
      creditCardName: 'Nubank Ultravioleta',
      installment: '1/3',
      status: 'pending',
      amount: 450.75
    },
    {
      id: 'tx-3',
      occurredAt: '2026-11-15T09:00:00Z',
      description: 'Transferência entre contas',
      type: 'transfer',
      categoryName: 'Transferências',
      accountName: 'Banco Inter',
      status: 'completed',
      amount: 1000.0
    }
  ]

  it('deve incluir o caractere BOM UTF-8 (\\uFEFF) no início do CSV por padrão', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })

  it('deve conter o cabeçalho oficial contábil pt-BR delimitado por ponto e vírgula', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[0]).toBe(
      'Data;Descrição;Tipo;Categoria;Centro de Custo / Conta;Forma / Cartão;Status;Data de Pagamento;Valor (R$);Observações'
    )
  })

  it('deve formatar valores numéricos com vírgula decimal padrão pt-BR', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    // Linha 1: 8500.50 -> 8500,50
    expect(lines[1]).toContain('8500,50')
    // Linha 2: 450.75 -> 450,75
    expect(lines[2]).toContain('450,75')
    // Linha 3: 1000.00 -> 1000,00
    expect(lines[3]).toContain('1000,00')
  })

  it('deve formatar datas no padrão DD/MM/AAAA', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[1].startsWith('10/11/2026')).toBe(true)
    expect(lines[2].startsWith('12/11/2026')).toBe(true)
    expect(lines[3].startsWith('15/11/2026')).toBe(true)
  })

  it('deve escapar adequadamente campos com ponto e vírgula, aspas e quebras de linha', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    // Descrição: Supermercado; Compra Semanal "Extra"
    // Deve ser envolvida em aspas e aspas internas duplicadas: "Supermercado; Compra Semanal ""Extra"""
    expect(lines[2]).toContain('"Supermercado; Compra Semanal ""Extra"""')
  })

  it('deve formatar corretamente informações de cartão de crédito e parcelas', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    // Forma / Cartão: Nubank Ultravioleta (1/3)
    expect(lines[2]).toContain('Nubank Ultravioleta (1/3)')
  })

  it('deve traduzir os tipos e status para português brasileiro formal', () => {
    const csv = generateTransactionsCSV(sampleTransactions)
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[1]).toContain('Receita')
    expect(lines[1]).toContain('Concluído')
    expect(lines[2]).toContain('Despesa')
    expect(lines[2]).toContain('Pendente')
    expect(lines[3]).toContain('Transferência')
  })

  it('deve permitir desabilitar o BOM UTF-8 quando solicitado nas opções', () => {
    const csv = generateTransactionsCSV(sampleTransactions, { includeBom: false })
    expect(csv.startsWith('\uFEFF')).toBe(false)
    expect(csv.startsWith('Data;Descrição;')).toBe(true)
  })

  describe('downloadCSV', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn()
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('deve acionar download de arquivo no navegador criando elemento <a>', () => {
      const clickMock = vi.fn()
      const appendChildMock = vi.fn()
      const removeChildMock = vi.fn()

      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return {
            setAttribute: vi.fn(),
            click: clickMock,
            style: {}
          } as unknown as HTMLAnchorElement
        }
        return document.createElement(tagName)
      })

      vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildMock)
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildMock)

      downloadCSV('relatorio-test.csv', 'conteudo-csv')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickMock).toHaveBeenCalled()
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
