import { describe, it, expect } from 'vitest'
import {
  createCreditCardSchema,
  updateCreditCardSchema,
  payInvoiceSchema,
  anticipateInstallmentsSchema,
  creditCardBrandEnum
} from '../src/schemas/creditCards'

describe('Credit Cards Zod Schemas (TDD)', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000'

  describe('createCreditCardSchema', () => {
    it('deve validar um payload correto de cartão de crédito', () => {
      const payload = {
        name: 'Nubank Ultravioleta',
        accountId: validUUID,
        brand: 'mastercard',
        limitAmount: 15000,
        closingDay: 25,
        dueDay: 5,
        color: '#7bc816',
        lastFourDigits: '8821'
      }

      const result = createCreditCardSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand).toBe('mastercard')
        expect(result.data.closingDay).toBe(25)
      }
    })

    it('deve aplicar defaults corretos para brand e color', () => {
      const payload = {
        name: 'Itaú Black',
        accountId: validUUID,
        limitAmount: 20000,
        closingDay: 10,
        dueDay: 20
      }

      const result = createCreditCardSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand).toBe('mastercard')
        expect(result.data.color).toBe('#7bc816')
      }
    })

    it('deve rejeitar closingDay e dueDay fora do intervalo de 1 a 31', () => {
      const invalidClosing = {
        name: 'Cartão Inválido',
        accountId: validUUID,
        limitAmount: 5000,
        closingDay: 0,
        dueDay: 10
      }
      expect(createCreditCardSchema.safeParse(invalidClosing).success).toBe(false)

      const invalidDue = {
        name: 'Cartão Inválido',
        accountId: validUUID,
        limitAmount: 5000,
        closingDay: 10,
        dueDay: 32
      }
      expect(createCreditCardSchema.safeParse(invalidDue).success).toBe(false)
    })

    it('deve rejeitar limitAmount menor ou igual a zero', () => {
      const zeroLimit = {
        name: 'Cartão Sem Limite',
        accountId: validUUID,
        limitAmount: 0,
        closingDay: 15,
        dueDay: 25
      }
      expect(createCreditCardSchema.safeParse(zeroLimit).success).toBe(false)

      const negativeLimit = {
        name: 'Cartão Negativo',
        accountId: validUUID,
        limitAmount: -100,
        closingDay: 15,
        dueDay: 25
      }
      expect(createCreditCardSchema.safeParse(negativeLimit).success).toBe(false)
    })

    it('deve rejeitar accountId inválido (não UUID)', () => {
      const invalidAccount = {
        name: 'Cartão Teste',
        accountId: 'invalid-id-not-uuid',
        limitAmount: 1000,
        closingDay: 5,
        dueDay: 15
      }
      expect(createCreditCardSchema.safeParse(invalidAccount).success).toBe(false)
    })

    it('deve validar lastFourDigits estritamente com 4 dígitos numéricos', () => {
      const invalidDigitsLetters = {
        name: 'Cartão Teste',
        accountId: validUUID,
        limitAmount: 1000,
        closingDay: 5,
        dueDay: 15,
        lastFourDigits: '12a4'
      }
      expect(createCreditCardSchema.safeParse(invalidDigitsLetters).success).toBe(false)

      const invalidDigitsLength = {
        name: 'Cartão Teste',
        accountId: validUUID,
        limitAmount: 1000,
        closingDay: 5,
        dueDay: 15,
        lastFourDigits: '123'
      }
      expect(createCreditCardSchema.safeParse(invalidDigitsLength).success).toBe(false)
    })
  })

  describe('updateCreditCardSchema', () => {
    it('deve permitir atualização parcial de campos', () => {
      const partialPayload = {
        limitAmount: 25000,
        closingDay: 20
      }
      const result = updateCreditCardSchema.safeParse(partialPayload)
      expect(result.success).toBe(true)
    })
  })

  describe('payInvoiceSchema', () => {
    it('deve validar payload correto de liquidação de fatura', () => {
      const payload = {
        paymentAccountId: validUUID,
        amount: 1450.75,
        paidAt: '2026-11-20T10:00:00.000Z'
      }
      const result = payInvoiceSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar pagamento com valor zero ou negativo', () => {
      expect(
        payInvoiceSchema.safeParse({
          paymentAccountId: validUUID,
          amount: 0
        }).success
      ).toBe(false)

      expect(
        payInvoiceSchema.safeParse({
          paymentAccountId: validUUID,
          amount: -50
        }).success
      ).toBe(false)
    })

    it('deve rejeitar pagamento sem paymentAccountId ou com UUID inválido', () => {
      expect(
        payInvoiceSchema.safeParse({
          amount: 100
        }).success
      ).toBe(false)

      expect(
        payInvoiceSchema.safeParse({
          paymentAccountId: 'nao-uuid',
          amount: 100
        }).success
      ).toBe(false)
    })
  })

  describe('anticipateInstallmentsSchema', () => {
    it('deve validar lista de IDs de transações com no mínimo 1 UUID', () => {
      const payload = {
        transactionIds: [validUUID, '223e4567-e89b-12d3-a456-426614174001']
      }
      const result = anticipateInstallmentsSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar lista vazia de transações para antecipação', () => {
      const payload = {
        transactionIds: []
      }
      expect(anticipateInstallmentsSchema.safeParse(payload).success).toBe(false)
    })

    it('deve rejeitar lista com IDs que não sejam UUIDs', () => {
      const payload = {
        transactionIds: ['id-invalido']
      }
      expect(anticipateInstallmentsSchema.safeParse(payload).success).toBe(false)
    })
  })

  describe('creditCardBrandEnum', () => {
    it('deve aceitar bandeiras válidas do mercado brasileiro', () => {
      expect(creditCardBrandEnum.safeParse('mastercard').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('visa').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('elo').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('amex').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('hipercard').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('other').success).toBe(true)
      expect(creditCardBrandEnum.safeParse('diners').success).toBe(false)
    })
  })
})
