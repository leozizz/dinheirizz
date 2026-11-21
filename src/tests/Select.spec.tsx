import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select'

describe('Select primitive', () => {
  it('renderiza SelectTrigger com data-testid, aria-label e min-h-[44px]', () => {
    render(
      <Select value="checking" onValueChange={vi.fn()}>
        <SelectTrigger data-testid="test-select" aria-label="Tipo de Conta">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="checking">Conta Corrente</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('test-select')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-label', 'Tipo de Conta')
    expect(trigger.className).toContain('min-h-[44px]')
    expect(trigger).toHaveTextContent('Conta Corrente')
  })

  it('abre lista ao clicar, seleciona item com conteúdo rico e dispara onValueChange', () => {
    const onValueChange = vi.fn()
    render(
      <Select value="checking" onValueChange={onValueChange}>
        <SelectTrigger data-testid="account-select" aria-label="Conta">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="checking">
            <span className="inline-flex items-center gap-2">
              <span data-testid="dot-checking" className="w-2 h-2 rounded-full bg-primary" />
              Conta Corrente
            </span>
          </SelectItem>
          <SelectItem value="savings">Poupança</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('account-select')
    fireEvent.click(trigger)

    const option = screen.getByRole('option', { name: 'Poupança' })
    expect(option).toBeInTheDocument()
    fireEvent.click(option)

    expect(onValueChange).toHaveBeenCalledWith('savings')
  })

  it('fecha o menu ao pressionar Escape', () => {
    render(
      <Select value="a" onValueChange={vi.fn()}>
        <SelectTrigger data-testid="esc-select" aria-label="Opções">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Opção A</SelectItem>
          <SelectItem value="b">Opção B</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('esc-select')
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('impede abertura quando disabled é true', () => {
    render(
      <Select value="a" onValueChange={vi.fn()} disabled>
        <SelectTrigger data-testid="disabled-select" aria-label="Desabilitado" disabled>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Opção A</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('disabled-select')
    expect(trigger).toBeDisabled()
    fireEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
