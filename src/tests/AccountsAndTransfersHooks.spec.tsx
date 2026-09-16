import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useAccounts, useCreateAccount, useDeleteAccount } from '../hooks/useAccounts'
import { useTransferTransaction } from '../hooks/useTransfer'
import { usePixKeys, useCreatePixKey, useDeletePixKey } from '../hooks/usePixKeys'

let mockSession: { access_token: string; user: any } | null = {
  access_token: 'valid-test-token',
  user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
}

vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual<any>('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: mockSession?.user || null,
      session: mockSession,
      loading: false,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn()
    })
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false }
    }
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('Accounts, Transfers and Pix Hooks with TanStack Query (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      access_token: 'valid-test-token',
      user: { id: 'test-user-123', email: 'test@dinheirizz.com' }
    }

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''

      // /api/v1/accounts
      if (urlStr.includes('/api/v1/accounts')) {
        if (init?.method === 'POST') {
          const body = JSON.parse((init?.body as string) || '{}')
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 'acc-new-1',
              name: body.name,
              type: body.type || 'checking',
              balance: String(body.balance || 0)
            })
          } as Response
        }

        if (init?.method === 'DELETE') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: 'acc-1', name: 'Nubank Principal', type: 'checking', balance: '5200.00' },
              { id: 'acc-2', name: 'Inter Poupança', type: 'savings', balance: '1800.00' }
            ],
            total: 2
          })
        } as Response
      }

      // /api/v1/transfers
      if (urlStr.includes('/api/v1/transfers')) {
        const body = JSON.parse((init?.body as string) || '{}')
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            fromTransaction: { id: 'tx-out', accountId: body.fromAccountId, amount: `-${body.amount}` },
            toTransaction: { id: 'tx-in', accountId: body.toAccountId, amount: `${body.amount}` }
          })
        } as Response
      }

      // /api/v1/pix-keys
      if (urlStr.includes('/api/v1/pix-keys')) {
        if (init?.method === 'POST') {
          const body = JSON.parse((init?.body as string) || '{}')
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 'pix-new-1',
              keyType: body.keyType,
              keyValue: body.keyValue,
              bankName: body.bankName
            })
          } as Response
        }

        if (init?.method === 'DELETE') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: 'pix-1', keyType: 'email', keyValue: 'contato@dinheirizz.com', bankName: 'Nubank' },
              { id: 'pix-2', keyType: 'cpf', keyValue: '123.456.789-00', bankName: 'Itaú' }
            ],
            total: 2
          })
        } as Response
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      } as Response
    })
  })

  it('deve carregar contas e calcular saldo consolidado via useAccounts', async () => {
    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.accounts).toHaveLength(2)
    expect(result.current.totalAccountsBalance).toBe(7000.00) // 5200 + 1800
  })

  it('não deve disparar requisição para contas se estiver deslogado', async () => {
    mockSession = null

    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper()
    })

    expect(result.current.accounts).toEqual([])
    const accountCalls = (global.fetch as any).mock.calls.filter(([url]: [string]) => url.includes('/api/v1/accounts'))
    expect(accountCalls).toHaveLength(0)
  })

  it('deve disparar mutação para criar conta via useCreateAccount', async () => {
    const { result } = renderHook(() => useCreateAccount(), {
      wrapper: createWrapper()
    })

    await result.current.mutateAsync({
      name: 'Itaú Cartão',
      type: 'checking',
      balance: 500
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/accounts'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })

  it('deve disparar mutação de transferência via useTransferTransaction', async () => {
    const { result } = renderHook(() => useTransferTransaction(), {
      wrapper: createWrapper()
    })

    await result.current.mutateAsync({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 250,
      description: 'Transferência teste'
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/transfers'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })

  it('deve buscar chaves Pix e permitir cadastro via usePixKeys e useCreatePixKey', async () => {
    const { result: listResult } = renderHook(() => usePixKeys(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(listResult.current.isLoading).toBe(false)
    })

    expect(listResult.current.pixKeys).toHaveLength(2)

    const { result: createResult } = renderHook(() => useCreatePixKey(), {
      wrapper: createWrapper()
    })

    await createResult.current.mutateAsync({
      keyType: 'phone',
      keyValue: '+5511999999999',
      bankName: 'Nubank'
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/pix-keys'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })
})
