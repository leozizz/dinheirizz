import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  accounts,
  categories,
  creditCards,
  openFinanceAccountLinks,
  openFinanceConnections,
  transactions
} from '../db/schema'
import { mockAccountsStore } from '../routes/accounts'
import { mockCreditCardsStore } from '../routes/creditCards'
import { mockTransactionsStore } from '../routes/transactions'
import { DEFAULT_CATEGORIES, mockCategoriesStore } from '../routes/categories'
import type {
  ExternalAccountInfo,
  ExternalTransactionInfo,
  OpenFinanceProviderAdapter
} from './openFinance'

export interface MockOpenFinanceConnection {
  id: string
  userId: string
  profileId: string | null
  provider: string
  externalItemId: string
  institutionId: string
  institutionName: string
  institutionLogoUrl: string | null
  status: string
  consentScope: string
  consentExpiresAt: string | null
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string | null
}

export interface MockOpenFinanceAccountLink {
  id: string
  connectionId: string
  userId: string
  externalAccountId: string
  externalAccountType: string
  externalAccountName: string
  accountId: string | null
  creditCardId: string | null
  lastBalance: string | null
  createdAt: string
  updatedAt: string | null
}

export const mockOpenFinanceConnectionsStore = new Map<string, MockOpenFinanceConnection>()
export const mockOpenFinanceAccountLinksStore = new Map<string, MockOpenFinanceAccountLink>()

export interface SyncSummary {
  accountsLinked: number
  transactionsImported: number
  duplicatesSkipped: number
  reconciledCount: number
}

interface HeuristicCategoryRule {
  keywords: string[]
  patterns: string[]
}

const HEURISTIC_CATEGORY_RULES: HeuristicCategoryRule[] = [
  {
    keywords: ['IFOOD', 'RESTAURANTE', 'PADARIA', 'MERCADO', 'SUPERMERCADO', 'LANCHONETE', 'BURGER', 'PIZZA', 'CAFE'],
    patterns: ['ALIMENTACAO', 'REFEICAO']
  },
  {
    keywords: ['UBER', '99APP', '99 POP', '99 TAXI', 'POSTO', 'SHELL', 'IPIRANGA', 'PETROBRAS', 'GASOLINA', 'COMBUSTIVEL'],
    patterns: ['TRANSPORTE', 'VEICULO', 'COMBUSTIVEL']
  },
  {
    keywords: ['DROGASIL', 'RAIA', 'DROGARIA', 'FARMACIA', 'PAGUE MENOS', 'HOSPITAL', 'MEDICO'],
    patterns: ['SAUDE', 'FARMACIA']
  },
  {
    keywords: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'YOUTUBE', 'DISNEY', 'APPLE', 'GOOGLE'],
    patterns: ['ASSINATURAS', 'SERVICOS', 'LAZER']
  },
  {
    keywords: ['CONDOMINIO', 'ENEL', 'SABESP', 'CPFL', 'LUZ', 'AGUA', 'GAS', 'ALUGUEL', 'CONTAS'],
    patterns: ['MORADIA', 'CASA', 'CONTAS']
  },
  {
    keywords: ['SALARIO', 'PAGTO SALARIO', 'REMUNERACAO', 'FOLHA', 'TED SALARIO'],
    patterns: ['SALARIO', 'RENDA']
  }
]

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

const getDaysDifference = (dateA: string, dateB: string): number => {
  const d1 = new Date(dateA.split('T')[0])
  const d2 = new Date(dateB.split('T')[0])
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 999
  const diffMs = Math.abs(d1.getTime() - d2.getTime())
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const suggestCategoryId = (
  description: string,
  userCategories: Array<{ id: string; name: string }>
): string | null => {
  const normDesc = normalizeText(description)
  const normalizedCats = userCategories.map((c) => ({
    id: c.id,
    normalizedName: normalizeText(c.name)
  }))

  for (const rule of HEURISTIC_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => normDesc.includes(kw))) {
      const matched = normalizedCats.find((cat) =>
        rule.patterns.some((p) => cat.normalizedName.includes(p))
      )
      if (matched) return matched.id
    }
  }
  return null
}

const isHeuristicMatch = (
  candidate: ExternalTransactionInfo,
  existingAmount: number,
  existingOccurredAt: string,
  existingExternalId: string | null | undefined
): boolean => {
  if (existingExternalId) return false
  const amountDiff = Math.abs(Math.abs(existingAmount) - Math.abs(candidate.amount))
  if (amountDiff > 0.01) return false
  const daysDiff = getDaysDifference(candidate.occurredAt, existingOccurredAt)
  return daysDiff <= 2
}

const syncInMemory = async (params: {
  connection: MockOpenFinanceConnection
  adapter: OpenFinanceProviderAdapter
}): Promise<SyncSummary> => {
  const { connection, adapter } = params
  const userId = connection.userId

  const externalAccounts = await adapter.listAccounts(connection.externalItemId)
  let accountsLinked = 0
  let transactionsImported = 0
  let duplicatesSkipped = 0
  let reconciledCount = 0

  let primaryAccountId: string | null = null
  const existingUserAccounts = Array.from(mockAccountsStore.values()).filter(
    (a) => a.userId === userId
  )
  if (existingUserAccounts.length > 0) {
    primaryAccountId = existingUserAccounts[0].id
  }

  const linkMap = new Map<string, MockOpenFinanceAccountLink>()
  for (const extAcc of externalAccounts) {
    const existingLink = Array.from(mockOpenFinanceAccountLinksStore.values()).find(
      (l) =>
        l.connectionId === connection.id &&
        l.externalAccountId === extAcc.externalAccountId
    )

    if (existingLink) {
      existingLink.lastBalance = extAcc.balance.toFixed(2)
      existingLink.updatedAt = new Date().toISOString()
      if (existingLink.accountId && mockAccountsStore.has(existingLink.accountId)) {
        const acc = mockAccountsStore.get(existingLink.accountId)
        if (acc && extAcc.type === 'BANK') {
          acc.balance = extAcc.balance.toFixed(2)
        }
      }
      linkMap.set(extAcc.externalAccountId, existingLink)
      accountsLinked++
      continue
    }

    let localAccountId: string | null = null
    let localCreditCardId: string | null = null

    if (extAcc.type === 'BANK') {
      const newAccId = crypto.randomUUID()
      mockAccountsStore.set(newAccId, {
        id: newAccId,
        userId,
        profileId: connection.profileId,
        name: `${connection.institutionName} - ${extAcc.name}`,
        type: 'checking',
        balance: extAcc.balance.toFixed(2),
        createdAt: new Date().toISOString()
      })
      localAccountId = newAccId
      if (!primaryAccountId) primaryAccountId = newAccId
    } else {
      if (!primaryAccountId) {
        const fallbackAccId = crypto.randomUUID()
        mockAccountsStore.set(fallbackAccId, {
          id: fallbackAccId,
          userId,
          profileId: connection.profileId,
          name: `${connection.institutionName} - Conta`,
          type: 'checking',
          balance: '0.00',
          createdAt: new Date().toISOString()
        })
        primaryAccountId = fallbackAccId
      }
      const newCardId = crypto.randomUUID()
      mockCreditCardsStore.set(newCardId, {
        id: newCardId,
        userId,
        profileId: connection.profileId,
        accountId: primaryAccountId,
        name: `${connection.institutionName} ${extAcc.name}`,
        brand: extAcc.brand ?? 'mastercard',
        limitAmount: (extAcc.creditLimit ?? 5000).toFixed(2),
        closingDay: 10,
        dueDay: 17,
        color: '#7bc816',
        lastFourDigits: extAcc.lastFourDigits ?? null,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      localAccountId = primaryAccountId
      localCreditCardId = newCardId
    }

    const linkId = crypto.randomUUID()
    const newLink: MockOpenFinanceAccountLink = {
      id: linkId,
      connectionId: connection.id,
      userId,
      externalAccountId: extAcc.externalAccountId,
      externalAccountType: extAcc.type,
      externalAccountName: extAcc.name,
      accountId: localAccountId,
      creditCardId: localCreditCardId,
      lastBalance: extAcc.balance.toFixed(2),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockOpenFinanceAccountLinksStore.set(linkId, newLink)
    linkMap.set(extAcc.externalAccountId, newLink)
    accountsLinked++
  }

  const userCategories =
    mockCategoriesStore.size > 0
      ? Array.from(mockCategoriesStore.values()).filter((c) => !c.userId || c.userId === userId)
      : DEFAULT_CATEGORIES

  for (const extAcc of externalAccounts) {
    const link = linkMap.get(extAcc.externalAccountId)
    const targetAccountId = link?.accountId ?? primaryAccountId
    if (!targetAccountId) continue

    const extTxs = await adapter.listTransactions(extAcc.externalAccountId)
    for (const extTx of extTxs) {
      const userTxs = Array.from(mockTransactionsStore.values()).filter(
        (t) => t.userId === userId
      )

      // Camada 1: Idempotência exata por externalId
      const exactMatch = userTxs.find((t) => t.externalId === extTx.externalId)
      if (exactMatch) {
        duplicatesSkipped++
        continue
      }

      // Camada 2: Conciliação heurística (mesma conta, |diff| <= 0.01, <= 2 dias)
      const heuristicTarget = userTxs.find(
        (t) =>
          t.accountId === targetAccountId &&
          isHeuristicMatch(extTx, Number(t.amount), t.occurredAt, t.externalId)
      )
      if (heuristicTarget) {
        heuristicTarget.externalId = extTx.externalId
        reconciledCount++
        continue
      }

      const categoryId = suggestCategoryId(extTx.description, userCategories)
      const txId = crypto.randomUUID()
      mockTransactionsStore.set(txId, {
        id: txId,
        userId,
        profileId: connection.profileId,
        accountId: targetAccountId,
        creditCardId: link?.creditCardId ?? null,
        categoryId,
        amount: Math.abs(extTx.amount).toFixed(2),
        description: extTx.description,
        paid: true,
        status: 'completed',
        type: extTx.type,
        externalId: extTx.externalId,
        source: 'open_finance',
        occurredAt: extTx.occurredAt,
        createdAt: new Date().toISOString()
      })
      transactionsImported++
    }
  }

  connection.lastSyncAt = new Date().toISOString()
  connection.lastError = null
  connection.status = 'active'
  connection.updatedAt = new Date().toISOString()

  return {
    accountsLinked,
    transactionsImported,
    duplicatesSkipped,
    reconciledCount
  }
}

export const syncOpenFinanceConnection = async (params: {
  connectionId: string
  userId: string
  adapter: OpenFinanceProviderAdapter
}): Promise<SyncSummary> => {
  const { connectionId, userId, adapter } = params
  const db = getDb()

  if (!db) {
    const conn = mockOpenFinanceConnectionsStore.get(connectionId)
    if (!conn || conn.userId !== userId) {
      throw new Error('Conexão Open Finance não encontrada')
    }
    return syncInMemory({ connection: conn, adapter })
  }

  const [conn] = await db
    .select()
    .from(openFinanceConnections)
    .where(
      and(
        eq(openFinanceConnections.id, connectionId),
        eq(openFinanceConnections.userId, userId)
      )
    )
    .limit(1)

  if (!conn) {
    throw new Error('Conexão Open Finance não encontrada')
  }

  const externalAccounts: ExternalAccountInfo[] = await adapter.listAccounts(
    conn.externalItemId
  )
  let accountsLinked = 0
  let transactionsImported = 0
  let duplicatesSkipped = 0
  let reconciledCount = 0

  const existingUserAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
  let primaryAccountId: string | null =
    existingUserAccounts.length > 0 ? existingUserAccounts[0].id : null

  const existingLinks = await db
    .select()
    .from(openFinanceAccountLinks)
    .where(eq(openFinanceAccountLinks.connectionId, conn.id))

  const linkByExternalId = new Map(
    existingLinks.map((l) => [l.externalAccountId, l])
  )

  for (const extAcc of externalAccounts) {
    const existingLink = linkByExternalId.get(extAcc.externalAccountId)
    if (existingLink) {
      await db
        .update(openFinanceAccountLinks)
        .set({
          lastBalance: extAcc.balance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(openFinanceAccountLinks.id, existingLink.id))

      if (existingLink.accountId && extAcc.type === 'BANK') {
        await db
          .update(accounts)
          .set({ balance: extAcc.balance.toFixed(2) })
          .where(eq(accounts.id, existingLink.accountId))
      }
      accountsLinked++
      continue
    }

    let localAccountId: string | null = null
    let localCreditCardId: string | null = null

    if (extAcc.type === 'BANK') {
      const [insertedAcc] = await db
        .insert(accounts)
        .values({
          userId,
          profileId: conn.profileId,
          name: `${conn.institutionName} - ${extAcc.name}`,
          type: 'checking',
          balance: extAcc.balance.toFixed(2)
        })
        .returning()
      localAccountId = insertedAcc.id
      if (!primaryAccountId) primaryAccountId = insertedAcc.id
    } else {
      if (!primaryAccountId) {
        const [fallbackAcc] = await db
          .insert(accounts)
          .values({
            userId,
            profileId: conn.profileId,
            name: `${conn.institutionName} - Conta`,
            type: 'checking',
            balance: '0.00'
          })
          .returning()
        primaryAccountId = fallbackAcc.id
      }

      const [insertedCard] = await db
        .insert(creditCards)
        .values({
          userId,
          profileId: conn.profileId,
          accountId: primaryAccountId,
          name: `${conn.institutionName} ${extAcc.name}`,
          brand: extAcc.brand ?? 'mastercard',
          limitAmount: (extAcc.creditLimit ?? 5000).toFixed(2),
          closingDay: 10,
          dueDay: 17,
          lastFourDigits: extAcc.lastFourDigits ?? null
        })
        .returning()
      localAccountId = primaryAccountId
      localCreditCardId = insertedCard.id
    }

    const [insertedLink] = await db
      .insert(openFinanceAccountLinks)
      .values({
        connectionId: conn.id,
        userId,
        externalAccountId: extAcc.externalAccountId,
        externalAccountType: extAcc.type,
        externalAccountName: extAcc.name,
        accountId: localAccountId,
        creditCardId: localCreditCardId,
        lastBalance: extAcc.balance.toFixed(2)
      })
      .returning()

    linkByExternalId.set(extAcc.externalAccountId, insertedLink)
    accountsLinked++
  }

  const userCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId))

  const existingUserTxs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  for (const extAcc of externalAccounts) {
    const link = linkByExternalId.get(extAcc.externalAccountId)
    const targetAccountId = link?.accountId ?? primaryAccountId
    if (!targetAccountId) continue

    const extTxs = await adapter.listTransactions(extAcc.externalAccountId)
    for (const extTx of extTxs) {
      const exactMatch = existingUserTxs.find(
        (t) => t.externalId === extTx.externalId
      )
      if (exactMatch) {
        duplicatesSkipped++
        continue
      }

      const heuristicTarget = existingUserTxs.find(
        (t) =>
          t.accountId === targetAccountId &&
          isHeuristicMatch(
            extTx,
            Number(t.amount),
            t.occurredAt.toISOString(),
            t.externalId
          )
      )
      if (heuristicTarget) {
        await db
          .update(transactions)
          .set({ externalId: extTx.externalId })
          .where(eq(transactions.id, heuristicTarget.id))
        heuristicTarget.externalId = extTx.externalId
        reconciledCount++
        continue
      }

      const categoryId = suggestCategoryId(extTx.description, userCategories)
      const [insertedTx] = await db
        .insert(transactions)
        .values({
          userId,
          profileId: conn.profileId,
          accountId: targetAccountId,
          creditCardId: link?.creditCardId ?? null,
          categoryId,
          amount: Math.abs(extTx.amount).toFixed(2),
          description: extTx.description,
          occurredAt: new Date(extTx.occurredAt),
          paid: true,
          status: 'completed',
          externalId: extTx.externalId,
          source: 'open_finance'
        })
        .returning()
      existingUserTxs.push(insertedTx)
      transactionsImported++
    }
  }

  await db
    .update(openFinanceConnections)
    .set({
      lastSyncAt: new Date(),
      lastError: null,
      status: 'active',
      updatedAt: new Date()
    })
    .where(eq(openFinanceConnections.id, conn.id))

  return {
    accountsLinked,
    transactionsImported,
    duplicatesSkipped,
    reconciledCount
  }
}
