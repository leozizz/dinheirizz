import { describe, it, expect } from 'vitest'
import {
  isWeekend,
  isNationalHoliday,
  isBusinessDay,
  adjustToNextBusinessDay,
  calculateRecurringDueDate
} from '../src/services/business-days'

describe('Motor de Dias Úteis Bancários (BFF - TDD)', () => {
  it('deve identificar fins de semana corretamente', () => {
    // 2026-10-10 é Sábado
    const saturday = new Date('2026-10-10T12:00:00Z')
    expect(isWeekend(saturday)).toBe(true)

    // 2026-10-11 é Domingo
    const sunday = new Date('2026-10-11T12:00:00Z')
    expect(isWeekend(sunday)).toBe(true)

    // 2026-10-12 é Segunda-feira
    const monday = new Date('2026-10-12T12:00:00Z')
    expect(isWeekend(monday)).toBe(false)
  })

  it('deve identificar feriados nacionais fixos e da consciência negra', () => {
    // 12/10 - N. Sra. Aparecida
    const holiday1 = new Date('2026-10-12T12:00:00Z')
    expect(isNationalHoliday(holiday1)).toBe(true)

    // 20/11 - Consciência Negra
    const holiday2 = new Date('2026-11-20T12:00:00Z')
    expect(isNationalHoliday(holiday2)).toBe(true)

    // 25/12 - Natal
    const holiday3 = new Date('2026-12-25T12:00:00Z')
    expect(isNationalHoliday(holiday3)).toBe(true)

    // 15/10 - Dia útil comum
    const normalDay = new Date('2026-10-15T12:00:00Z')
    expect(isNationalHoliday(normalDay)).toBe(false)
  })

  it('deve avançar sábado para segunda-feira', () => {
    // 2026-10-17 é Sábado -> deve avançar para 2026-10-19 (Segunda-feira)
    const saturday = new Date('2026-10-17T12:00:00Z')
    const adjusted = adjustToNextBusinessDay(saturday)

    expect(adjusted.getUTCDate()).toBe(19)
    expect(adjusted.getUTCMonth()).toBe(9) // Outubro (0-indexed = 9)
    expect(adjusted.getUTCDay()).toBe(1) // Segunda
  })

  it('deve avançar domingo para segunda-feira', () => {
    // 2026-10-18 é Domingo -> deve avançar para 2026-10-19 (Segunda-feira)
    const sunday = new Date('2026-10-18T12:00:00Z')
    const adjusted = adjustToNextBusinessDay(sunday)

    expect(adjusted.getUTCDate()).toBe(19)
    expect(adjusted.getUTCDay()).toBe(1)
  })

  it('deve avançar fim de semana que emenda com feriado bancário na segunda para a terça-feira', () => {
    // Em 2026, 12/10 é feriado na segunda-feira!
    // Se a data for 10/10 (Sábado) ou 11/10 (Domingo):
    // Não pode cair em 12/10 (Feriado), deve avançar para 13/10 (Terça-feira)!
    const saturdayBeforeHoliday = new Date('2026-10-10T12:00:00Z')
    const adjusted = adjustToNextBusinessDay(saturdayBeforeHoliday)

    expect(adjusted.getUTCDate()).toBe(13)
    expect(adjusted.getUTCDay()).toBe(2) // Terça-feira
  })

  it('deve manter inalterada a data que já é dia útil', () => {
    // 2026-10-14 é Quarta-feira, dia útil comum
    const wednesday = new Date('2026-10-14T12:00:00Z')
    const adjusted = adjustToNextBusinessDay(wednesday)

    expect(adjusted.getUTCDate()).toBe(14)
    expect(adjusted.getUTCDay()).toBe(3)
  })

  it('deve calcular data de vencimento recorrente com e sem ajuste de dia útil', () => {
    // Outubro/2026, dia 10 (Sábado)
    // Sem ajuste: mantém dia 10
    const rawDue = calculateRecurringDueDate(2026, 9, 10, false)
    expect(rawDue.getUTCDate()).toBe(10)

    // Com ajuste: como 10/10 é Sábado e 12/10 é Feriado, vai para 13/10
    const adjustedDue = calculateRecurringDueDate(2026, 9, 10, true)
    expect(adjustedDue.getUTCDate()).toBe(13)
  })
})
