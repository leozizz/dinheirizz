import { describe, it, expect } from 'vitest'
import { parseOFX } from '../lib/parsers/ofx'

describe('parseOFX (TDD)', () => {
  const sampleSGML = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <FI>
        <ORG>Nubank
        <FID>260
      </FI>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>0260
          <ACCTID>987654-1
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20261010120000[-3:BRT]
            <TRNAMT>-45.90
            <FITID>NUB-20261010-001
            <MEMO>iFood *Refeicao
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20261012
            <TRNAMT>1500.00
            <FITID>NUB-20261012-002
            <NAME>Pix Recebido Maria
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`

  const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <FI>
        <ORG>Banco Itaú</ORG>
      </FI>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <ACCTID>341-9988</ACCTID>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20261015143000</DTPOSTED>
            <TRNAMT>-120.50</TRNAMT>
            <FITID>ITAU-12345</FITID>
            <MEMO>Posto Ipiranga</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

  it('deve extrair transações de extrato OFX SGML não fechado', () => {
    const result = parseOFX(sampleSGML, 'extrato-nubank.ofx')

    expect(result.format).toBe('ofx')
    expect(result.fileName).toBe('extrato-nubank.ofx')
    expect(result.bankName).toBe('Nubank')
    expect(result.accountIdentifier).toBe('987654-1')
    expect(result.transactions).toHaveLength(2)

    const [debit, credit] = result.transactions
    expect(debit).toEqual(
      expect.objectContaining({
        fitid: 'NUB-20261010-001',
        date: '2026-10-10',
        description: 'iFood *Refeicao',
        amount: 45.9,
        type: 'expense',
        selected: true
      })
    )

    expect(credit).toEqual(
      expect.objectContaining({
        fitid: 'NUB-20261012-002',
        date: '2026-10-12',
        description: 'Pix Recebido Maria',
        amount: 1500,
        type: 'income',
        selected: true
      })
    )

    expect(result.totalIncome).toBe(1500)
    expect(result.totalExpense).toBe(45.9)
  })

  it('deve extrair transações de extrato OFX XML estruturado', () => {
    const result = parseOFX(sampleXML, 'extrato-itau.ofx')

    expect(result.bankName).toBe('Banco Itaú')
    expect(result.accountIdentifier).toBe('341-9988')
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        fitid: 'ITAU-12345',
        date: '2026-10-15',
        description: 'Posto Ipiranga',
        amount: 120.5,
        type: 'expense'
      })
    )
  })

  it('deve lidar com arquivos corrompidos ou vazios sem quebrar', () => {
    const emptyResult = parseOFX('', 'vazio.ofx')
    expect(emptyResult.transactions).toHaveLength(0)
    expect(emptyResult.totalIncome).toBe(0)
    expect(emptyResult.totalExpense).toBe(0)

    const corruptResult = parseOFX('qualquer lixo sem tags de transação', 'lixo.ofx')
    expect(corruptResult.transactions).toHaveLength(0)
  })
})
