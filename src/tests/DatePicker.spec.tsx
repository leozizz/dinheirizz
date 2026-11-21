import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { format, subDays, addDays } from 'date-fns'
import { DatePicker } from '../components/ui/DatePicker'

describe('DatePicker primitive', () => {
  it('exibe data formatada em PT-BR (dd/MM/yyyy) sem deslocamento de timezone e respeita min-h-[44px]', () => {
    render(
      <DatePicker
        value="2026-11-21"
        onChange={vi.fn()}
        dataTestId="test-datepicker"
        ariaLabel="Data da Operação"
      />
    )

    const trigger = screen.getByTestId('test-datepicker')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-label', 'Data da Operação')
    expect(trigger.className).toContain('min-h-[44px]')
    expect(trigger).toHaveTextContent('21/11/2026')
  })

  it('seleciona Hoje, Ontem e Amanhã em 1 clique e fecha o popover', () => {
    const onChange = vi.fn()
    render(
      <DatePicker
        value="2026-11-21"
        onChange={onChange}
        dataTestId="preset-datepicker"
        ariaLabel="Data"
      />
    )

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    fireEvent.click(screen.getByTestId('preset-datepicker'))
    fireEvent.click(screen.getByTestId('datepicker-preset-today'))
    expect(onChange).toHaveBeenLastCalledWith(todayStr)
    expect(screen.queryByTestId('datepicker-preset-today')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('preset-datepicker'))
    fireEvent.click(screen.getByTestId('datepicker-preset-yesterday'))
    expect(onChange).toHaveBeenLastCalledWith(yesterdayStr)
    expect(screen.queryByTestId('datepicker-preset-yesterday')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('preset-datepicker'))
    fireEvent.click(screen.getByTestId('datepicker-preset-tomorrow'))
    expect(onChange).toHaveBeenLastCalledWith(tomorrowStr)
    expect(screen.queryByTestId('datepicker-preset-tomorrow')).not.toBeInTheDocument()
  })

  it('permite seleção de dia específico no calendário e fecha com Escape', () => {
    const onChange = vi.fn()
    render(
      <DatePicker
        value="2026-11-21"
        onChange={onChange}
        dataTestId="calendar-datepicker"
        ariaLabel="Data"
      />
    )

    fireEvent.click(screen.getByTestId('calendar-datepicker'))
    const day15Button = screen.getByText('15')
    fireEvent.click(day15Button)
    expect(onChange).toHaveBeenCalledWith('2026-11-15')
    expect(screen.queryByTestId('datepicker-preset-today')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('calendar-datepicker'))
    expect(screen.getByTestId('datepicker-preset-today')).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByTestId('datepicker-preset-today')).not.toBeInTheDocument()
  })

  it('suporta tone="warning" e estado disabled', () => {
    render(
      <DatePicker
        value=""
        onChange={vi.fn()}
        dataTestId="warning-datepicker"
        tone="warning"
        disabled
      />
    )

    const trigger = screen.getByTestId('warning-datepicker')
    expect(trigger).toBeDisabled()
    expect(trigger.className).toContain('amber')
    fireEvent.click(trigger)
    expect(screen.queryByTestId('datepicker-preset-today')).not.toBeInTheDocument()
  })
})
