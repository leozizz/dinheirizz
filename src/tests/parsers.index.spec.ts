import { describe, it, expect } from 'vitest'
import { parseStatementFile } from '../lib/parsers/index'

describe('parseStatementFile (TDD)', () => {
  it('deve rotear arquivo .ofx para o parser de OFX', async () => {
    const ofxContent = `
<OFX>
  <BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
    <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20261010
      <TRNAMT>-50.00
      <MEMO>Lanchonete
    </STMTTRN>
  </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

    const file = new File([ofxContent], 'extrato.ofx', { type: 'text/plain' })
    const result = await parseStatementFile(file)

    expect(result.format).toBe('ofx')
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].description).toBe('Lanchonete')
  })

  it('deve rotear arquivo .csv para o parser de CSV', async () => {
    const csvContent = 'Data;Descrição;Valor\n10/10/2026;Restaurante;-45,00'
    const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' })
    const result = await parseStatementFile(file)

    expect(result.format).toBe('csv')
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].description).toBe('Restaurante')
  })

  it('deve rotear arquivo .pdf para o parser de PDF', async () => {
    const pdfText = '10/10/2026 Padaria do Bairro -R$ 22,50'
    const file = new File([pdfText], 'extrato.pdf', { type: 'application/pdf' })
    const result = await parseStatementFile(file)

    expect(result.format).toBe('pdf')
    expect(result.transactions).toHaveLength(1)
  })

  it('deve rejeitar arquivo com extensão não suportada', async () => {
    const file = new File(['teste'], 'imagem.png', { type: 'image/png' })
    await expect(parseStatementFile(file)).rejects.toThrow(
      'Formato de arquivo não suportado. Por favor, envie um arquivo .ofx, .csv ou .pdf.'
    )
  })

  it('deve rejeitar arquivo superior a 10MB', async () => {
    const largeBlob = new Blob([new Uint8Array(11 * 1024 * 1024)])
    const file = new File([largeBlob], 'grande.csv', { type: 'text/csv' })
    await expect(parseStatementFile(file)).rejects.toThrow(
      'Arquivo muito grande. O limite máximo permitido para importação é 10MB.'
    )
  })
})
