import { describe, it, expect } from 'vitest'
import {
  isWeekend,
  isNationalHoliday,
  isBusinessDay,
  adjustToNextBusinessDay,
  calculateRecurringDueDate
} from '../lib/businessDays'

describe('Motor de Dias Úteis Bancários (Frontend - TDD)', () => {
  it('deve identificar fins de semana e dias úteis', () => {
    const saturday = new Date('2026-10-10T12:00:00Z')
    const sunday = new Date('2026-10-11T12:00:00Z')
    const tuesday = new Date('2026-10-13T12:00:00Z')

    expect(isWeekend(saturday)).toBe(true)
    expect(isWeekend(sunday)).toBe(true)
    expect(isWeekend(tuesday)).toBe(false)
    expect(isBusinessDay(tuesday)).toBe(true)
  })

  it('deve identificar feriados nacionais', () => {
    const aparecida = new Date('2026-10-12T12:00:00Z')
    const normal = new Date('2026-10-14T12:00:00Z')

    expect(isNationalHoliday(aparecida)).toBe(true)
    expect(isBusinessDay(aparecida)).toBe(false)
    expect(isNationalHoliday(normal)).toBe(false)
    expect(isBusinessDay(normal)).toBe(true)
  })

  it('deve prorrogar adequadamente para o próximo dia útil', () => {
    // 10/10 (Sáb) e 12/10 (Seg - Feriado) -> 13/10 (Ter)
    const sat = new Date('2026-10-10T12:00:00Z')
    const adj = adjustToNextBusinessDay(sat)
    expect(adj.getUTCDate()).toBe(13)

    // Cálculo recorrente
    const due = calculateRecurringDueDate(2026, 9, 10, true)
    expect(due.getUTCDate()).toBe(13)
  })
})
