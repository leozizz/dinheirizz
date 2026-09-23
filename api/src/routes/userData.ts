import { Hono } from 'hono'
import { getDb } from '../db/client'
import { accounts, transactions, pixKeys } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { AuthEnv } from '../middlewares/auth'
import { mockTransactionsStore } from './transactions'
import { mockAccountsStore } from './accounts'
import { mockPixKeysStore } from './pix'

export const userDataRouter = new Hono<AuthEnv>()

/**
 * DELETE /api/v1/user-data/transactions
 * Exclui todas as transações do usuário e zera o saldo de suas contas
 */
userDataRouter.delete('/transactions', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    // 1. Remove todas as transações do usuário em mock
    for (const [id, tx] of mockTransactionsStore.entries()) {
      if (tx.userId === userId) {
        mockTransactionsStore.delete(id)
      }
    }

    // 2. Zera saldo das contas do usuário em mock
    for (const [, acc] of mockAccountsStore.entries()) {
      if (acc.userId === userId) {
        acc.balance = '0.00'
      }
    }

    return c.json({
      success: true,
      message: 'Todas as transações foram excluídas com sucesso e os saldos foram zerados.'
    })
  }

  try {
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.update(accounts).set({ balance: '0.00' }).where(eq(accounts.userId, userId))

    return c.json({
      success: true,
      message: 'Todas as transações foram excluídas com sucesso e os saldos foram zerados.'
    })
  } catch (error) {
    return c.json(
      {
        error: 'Erro ao excluir transações',
        message: error instanceof Error ? error.message : 'Falha na exclusão'
      },
      500
    )
  }
})

/**
 * DELETE /api/v1/user-data/pix-keys
 * Exclui todas as chaves Pix cadastradas pelo usuário
 */
userDataRouter.delete('/pix-keys', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    for (const [id, pk] of mockPixKeysStore.entries()) {
      if (pk.userId === userId) {
        mockPixKeysStore.delete(id)
      }
    }

    return c.json({
      success: true,
      message: 'Todas as chaves Pix foram excluídas com sucesso.'
    })
  }

  try {
    await db.delete(pixKeys).where(eq(pixKeys.userId, userId))

    return c.json({
      success: true,
      message: 'Todas as chaves Pix foram excluídas com sucesso.'
    })
  } catch (error) {
    return c.json(
      {
        error: 'Erro ao excluir chaves Pix',
        message: error instanceof Error ? error.message : 'Falha na exclusão'
      },
      500
    )
  }
})

/**
 * DELETE /api/v1/user-data/accounts
 * Exclui todas as contas do usuário (e em cascata todas as transações), recriando a Conta Principal
 */
userDataRouter.delete('/accounts', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    // Limpa transações do usuário
    for (const [id, tx] of mockTransactionsStore.entries()) {
      if (tx.userId === userId) {
        mockTransactionsStore.delete(id)
      }
    }

    // Limpa contas do usuário
    for (const [id, acc] of mockAccountsStore.entries()) {
      if (acc.userId === userId) {
        mockAccountsStore.delete(id)
      }
    }

    // Cria nova conta principal padrão
    const defaultAccountId = `acc-default-${crypto.randomUUID()}`
    mockAccountsStore.set(defaultAccountId, {
      id: defaultAccountId,
      userId,
      name: 'Conta Principal',
      type: 'checking',
      balance: '0.00',
      createdAt: new Date().toISOString()
    })

    return c.json({
      success: true,
      message: 'Todas as contas e movimentações foram excluídas com sucesso. Conta Principal reinicializada.',
      defaultAccountId
    })
  }

  try {
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(accounts).where(eq(accounts.userId, userId))

    const [newAcc] = await db
      .insert(accounts)
      .values({
        userId,
        name: 'Conta Principal',
        type: 'checking',
        balance: '0.00'
      })
      .returning()

    return c.json({
      success: true,
      message: 'Todas as contas e movimentações foram excluídas com sucesso. Conta Principal reinicializada.',
      defaultAccountId: newAcc.id
    })
  } catch (error) {
    return c.json(
      {
        error: 'Erro ao excluir contas',
        message: error instanceof Error ? error.message : 'Falha na exclusão'
      },
      500
    )
  }
})

/**
 * DELETE /api/v1/user-data/reset-all
 * Reset geral da conta: remove chaves Pix, transações e contas, reinicializando Conta Principal
 */
userDataRouter.delete('/reset-all', async (c) => {
  const userId = c.get('userId')
  const db = getDb()

  if (!db) {
    // 1. Limpa chaves Pix
    for (const [id, pk] of mockPixKeysStore.entries()) {
      if (pk.userId === userId) {
        mockPixKeysStore.delete(id)
      }
    }

    // 2. Limpa transações
    for (const [id, tx] of mockTransactionsStore.entries()) {
      if (tx.userId === userId) {
        mockTransactionsStore.delete(id)
      }
    }

    // 3. Limpa contas
    for (const [id, acc] of mockAccountsStore.entries()) {
      if (acc.userId === userId) {
        mockAccountsStore.delete(id)
      }
    }

    // 4. Cria Conta Principal limpa
    const defaultAccountId = `acc-default-${crypto.randomUUID()}`
    mockAccountsStore.set(defaultAccountId, {
      id: defaultAccountId,
      userId,
      name: 'Conta Principal',
      type: 'checking',
      balance: '0.00',
      createdAt: new Date().toISOString()
    })

    return c.json({
      success: true,
      message: 'Reset geral concluído. Todos os registros foram limpos com sucesso.',
      defaultAccountId
    })
  }

  try {
    await db.delete(pixKeys).where(eq(pixKeys.userId, userId))
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(accounts).where(eq(accounts.userId, userId))

    const [newAcc] = await db
      .insert(accounts)
      .values({
        userId,
        name: 'Conta Principal',
        type: 'checking',
        balance: '0.00'
      })
      .returning()

    return c.json({
      success: true,
      message: 'Reset geral concluído. Todos os registros foram limpos com sucesso.',
      defaultAccountId: newAcc.id
    })
  } catch (error) {
    return c.json(
      {
        error: 'Erro ao executar reset geral',
        message: error instanceof Error ? error.message : 'Falha no reset'
      },
      500
    )
  }
})
