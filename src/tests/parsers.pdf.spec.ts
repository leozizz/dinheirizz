import { describe, it, expect } from 'vitest'
import { parsePDF } from '../lib/parsers/pdf'

describe('parsePDF (TDD)', () => {
  it('deve extrair transações a partir de texto de extrato bancário com linhas formatadas', () => {
    const pdfText = `
EXTRATO BANCÁRIO DIGITAL - BANCO INTER
Conta: 1234567-8
Período: 01/10/2026 a 31/10/2026

05/10/2026 Supermercado Pão de Açúcar -R$ 185,40
08/10/2026 PIX Recebido João Silva R$ 1.200,00
12/10/2026 Farmácia Drogasil -R$ 45,90
`
    const result = parsePDF(pdfText, 'extrato-inter.pdf')

    expect(result.format).toBe('pdf')
    expect(result.fileName).toBe('extrato-inter.pdf')
    expect(result.transactions).toHaveLength(3)

    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        date: '2026-10-05',
        description: 'Supermercado Pão de Açúcar',
        amount: 185.4,
        type: 'expense',
        selected: true
      })
    )

    expect(result.transactions[1]).toEqual(
      expect.objectContaining({
        date: '2026-10-08',
        description: 'PIX Recebido João Silva',
        amount: 1200,
        type: 'income',
        selected: true
      })
    )

    expect(result.transactions[2]).toEqual(
      expect.objectContaining({
        date: '2026-10-12',
        description: 'Farmácia Drogasil',
        amount: 45.9,
        type: 'expense',
        selected: true
      })
    )

    expect(result.totalIncome).toBe(1200)
    expect(result.totalExpense).toBe(231.3)
  })

  it('deve lançar erro amigável quando o PDF não contiver texto legível (PDF escaneado ou vazio)', () => {
    expect(() => parsePDF('', 'escaneado.pdf')).toThrow(
      'Não foi possível extrair transações deste PDF. Se for um documento escaneado (imagem), recomendamos exportar o extrato no formato OFX ou CSV.'
    )

    expect(() => parsePDF('%PDF-1.4 %%EOF sem nenhum texto estruturado', 'sem-texto.pdf')).toThrow(
      'Não foi possível extrair transações deste PDF. Se for um documento escaneado (imagem), recomendamos exportar o extrato no formato OFX ou CSV.'
    )
  })
})
