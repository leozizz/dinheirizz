import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import app from '../index'
import { calculateGoalMetrics } from '../src/services/goals'
import { mockWorkspacesStore } from '../src/routes/workspaces'
import { mockGoalsStore } from '../src/routes/goals'
import { mockAccountsStore } from '../src/routes/accounts'
import { mockTransactionsStore } from '../src/routes/transactions'
import { mockBudgetsStore } from '../src/routes/budgets'
import { mockCreditCardsStore } from '../src/routes/creditCards'

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'

const createToken = async (userId: string, email: string): Promise<string> => {
  return sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    TEST_JWT_SECRET,
    'HS256'
  )
}

describe('Workspaces (Perfis Financeiros) & Savings Goals (Caixinhas) - TDD', () => {
  const userA = '11111111-1111-4111-8111-111111111111'
  const userB = '22222222-2222-4222-8222-222222222222'
  let tokenA: string
  let tokenB: string

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    tokenA = await createToken(userA, 'usera@dinheirizz.com')
    tokenB = await createToken(userB, 'userb@dinheirizz.com')
  })

  beforeEach(() => {
    mockWorkspacesStore.clear()
    mockGoalsStore.clear()
    mockBudgetsStore.clear()
    mockCreditCardsStore.clear()
  })

  describe('Passo 2: calculateGoalMetrics (serviço puro)', () => {
    it('deve calcular remainingAmount, progressPercentage, monthsRemaining e monthlyRequiredAmount corretamente', () => {
      const result = calculateGoalMetrics({
        targetAmount: 2000,
        currentAmount: 800,
        deadline: '2027-03-21T00:00:00.000Z',
        referenceDate: new Date('2026-11-21T00:00:00.000Z')
      })

      expect(result.remainingAmount).toBe(1200)
      expect(result.progressPercentage).toBe(40)
      expect(result.isCompleted).toBe(false)
      expect(result.monthsRemaining).toBe(4)
      expect(result.monthlyRequiredAmount).toBe(300)
    })

    it('deve retornar monthsRemaining null e monthlyRequiredAmount null quando deadline for null', () => {
      const result = calculateGoalMetrics({
        targetAmount: 5000,
        currentAmount: 1000,
        deadline: null,
        referenceDate: new Date('2026-11-21T00:00:00.000Z')
      })

      expect(result.remainingAmount).toBe(4000)
      expect(result.progressPercentage).toBe(20)
      expect(result.isCompleted).toBe(false)
      expect(result.monthsRemaining).toBeNull()
      expect(result.monthlyRequiredAmount).toBeNull()
    })

    it('deve limitar progressPercentage a 100 e retornar monthlyRequiredAmount 0 quando meta estiver concluída', () => {
      const result = calculateGoalMetrics({
        targetAmount: 1000,
        currentAmount: 1250,
        deadline: '2027-05-01T00:00:00.000Z',
        referenceDate: new Date('2026-11-21T00:00:00.000Z')
      })

      expect(result.remainingAmount).toBe(0)
      expect(result.progressPercentage).toBe(100)
      expect(result.isCompleted).toBe(true)
      expect(result.monthsRemaining).toBeNull()
      expect(result.monthlyRequiredAmount).toBe(0)
    })

    it('deve usar mínimo de 1 mês quando o prazo já estiver vencido e a meta não concluída', () => {
      const result = calculateGoalMetrics({
        targetAmount: 1000,
        currentAmount: 400,
        deadline: '2026-10-01T00:00:00.000Z',
        referenceDate: new Date('2026-11-21T00:00:00.000Z')
      })

      expect(result.remainingAmount).toBe(600)
      expect(result.monthsRemaining).toBe(1)
      expect(result.monthlyRequiredAmount).toBe(600)
    })
  })

  describe('Passo 3A: /api/v1/workspaces', () => {
    it('deve retornar 401 sem token de autenticação', async () => {
      const res = await app.request('/api/v1/workspaces')
      expect(res.status).toBe(401)
    })

    it('deve auto-provisionar perfil padrão "Pessoal" quando usuário não possuir perfis', async () => {
      const res = await app.request('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.profiles).toHaveLength(1)
      expect(data.profiles[0].name).toBe('Pessoal')
      expect(data.profiles[0].type).toBe('personal')
      expect(data.profiles[0].isDefault).toBe(true)
      expect(data.activeDefaultId).toBe(data.profiles[0].id)
    })

    it('deve criar perfil "Empresa / PJ", alternar isDefault e impedir exclusão do perfil padrão', async () => {
      // Auto-provisiona Pessoal
      const initRes = await app.request('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const initData = await initRes.json()
      const personalId = initData.profiles[0].id

      // Tenta excluir o perfil padrão/único -> 400
      const delDefaultRes = await app.request(`/api/v1/workspaces/${personalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(delDefaultRes.status).toBe(400)

      // Cria perfil PJ
      const createRes = await app.request('/api/v1/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          name: 'Empresa / PJ',
          type: 'business',
          currency: 'BRL'
        })
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json()
      expect(created.profile.name).toBe('Empresa / PJ')
      expect(created.profile.type).toBe('business')
      expect(created.profile.isDefault).toBe(false)

      // Atualiza nome do perfil PJ
      const patchRes = await app.request(`/api/v1/workspaces/${created.profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ name: 'Consultoria PJ' })
      })
      expect(patchRes.status).toBe(200)
      const patched = await patchRes.json()
      expect(patched.profile.name).toBe('Consultoria PJ')

      // Exclui perfil secundário PJ -> 200
      const delSecondaryRes = await app.request(`/api/v1/workspaces/${created.profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(delSecondaryRes.status).toBe(200)
    })

    it('deve impedir acesso ou alteração de perfil de outro usuário', async () => {
      const initA = await app.request('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const dataA = await initA.json()
      const profileAId = dataA.profiles[0].id

      const patchByB = await app.request(`/api/v1/workspaces/${profileAId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ name: 'Hackeado' })
      })
      expect(patchByB.status).toBe(404)
    })
  })

  describe('Passo 3B: /api/v1/goals', () => {
    it('deve executar CRUD completo de metas e aporte rápido isolado por userId', async () => {
      // Criar meta
      const createRes = await app.request('/api/v1/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          name: 'Reserva de Emergência',
          targetAmount: 10000,
          currentAmount: 2000,
          deadline: '2027-07-21T00:00:00.000Z'
        })
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json()
      expect(created.goal.name).toBe('Reserva de Emergência')
      expect(created.goal.progressPercentage).toBe(20)
      expect(created.goal.remainingAmount).toBe(8000)

      const goalId = created.goal.id

      // Aporte rápido inválido (<= 0) -> 400
      const badContribute = await app.request(`/api/v1/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ amount: -50 })
      })
      expect(badContribute.status).toBe(400)

      // Aporte rápido válido -> 200
      const contributeRes = await app.request(`/api/v1/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ amount: 500 })
      })
      expect(contributeRes.status).toBe(200)
      const contributed = await contributeRes.json()
      expect(contributed.goal.currentAmount).toBe(2500)
      expect(contributed.goal.progressPercentage).toBe(25)
      expect(contributed.goal.remainingAmount).toBe(7500)

      // Outro usuário tentando aportar ou listar -> 404 / lista vazia
      const contributeByB = await app.request(`/api/v1/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ amount: 100 })
      })
      expect(contributeByB.status).toBe(404)

      const listB = await app.request('/api/v1/goals', {
        headers: { Authorization: `Bearer ${tokenB}` }
      })
      const listBData = await listB.json()
      expect(listBData.goals).toHaveLength(0)

      // Listagem usuário A com summary
      const listA = await app.request('/api/v1/goals', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const listAData = await listA.json()
      expect(listAData.goals).toHaveLength(1)
      expect(listAData.summary.totalSaved).toBe(2500)
      expect(listAData.summary.totalTarget).toBe(10000)
      expect(listAData.summary.activeCount).toBe(1)
      expect(listAData.summary.completedCount).toBe(0)

      // Excluir meta
      const delRes = await app.request(`/api/v1/goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(delRes.status).toBe(200)
    })
  })

  describe('Passo 4: Isolamento e filtro por profileId nas rotas existentes', () => {
    it('deve filtrar contas, transações, orçamentos, forecast, cartões e relatórios por profileId sem vazamento', async () => {
      // Provisiona perfil Pessoal e cria perfil PJ para userA
      const wsRes = await app.request('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const wsData = await wsRes.json()
      const personalId = wsData.profiles[0].id as string

      const pjRes = await app.request('/api/v1/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ name: 'PJ', type: 'business' })
      })
      const pjData = await pjRes.json()
      const pjId = pjData.profile.id as string

      // Cria conta Pessoal e conta PJ
      const accPersonalRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ name: 'Conta PF', type: 'checking', balance: 1000, profileId: personalId })
      })
      const accPersonal = await accPersonalRes.json()

      const accPjRes = await app.request('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ name: 'Conta PJ', type: 'checking', balance: 5000, profileId: pjId })
      })
      const accPj = await accPjRes.json()

      // Consulta contas filtradas por personalId
      const getAccPersonal = await app.request(`/api/v1/accounts?profileId=${personalId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const accPersonalList = await getAccPersonal.json()
      expect(accPersonalList.data.some((a: { id: string }) => a.id === accPersonal.id)).toBe(true)
      expect(accPersonalList.data.some((a: { id: string }) => a.id === accPj.id)).toBe(false)

      // Consulta contas com profileId=all -> retorna ambas
      const getAccAll = await app.request('/api/v1/accounts?profileId=all', {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const accAllList = await getAccAll.json()
      expect(accAllList.data.some((a: { id: string }) => a.id === accPersonal.id)).toBe(true)
      expect(accAllList.data.some((a: { id: string }) => a.id === accPj.id)).toBe(true)

      // Cria transações PF e PJ
      const txPfRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          amount: 200,
          type: 'expense',
          description: 'Supermercado PF',
          accountId: accPersonal.id,
          profileId: personalId,
          occurredAt: '2026-11-10T12:00:00.000Z'
        })
      })
      expect(txPfRes.status).toBe(201)

      const txPjRes = await app.request('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          amount: 1500,
          type: 'income',
          description: 'Nota Fiscal PJ',
          accountId: accPj.id,
          profileId: pjId,
          occurredAt: '2026-11-10T12:00:00.000Z'
        })
      })
      expect(txPjRes.status).toBe(201)

      // Consulta transações filtradas por personalId
      const getTxPf = await app.request(`/api/v1/transactions?profileId=${personalId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const txPfData = await getTxPf.json()
      expect(txPfData.data.some((t: { description: string }) => t.description === 'Supermercado PF')).toBe(true)
      expect(txPfData.data.some((t: { description: string }) => t.description === 'Nota Fiscal PJ')).toBe(false)

      // Forecast filtrado por personalId não inclui saldo da Conta PJ (5000)
      const forecastPfRes = await app.request(`/api/v1/forecast?profileId=${personalId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(forecastPfRes.status).toBe(200)
      const forecastPf = await forecastPfRes.json()
      expect(forecastPf.startingBalance).toBeLessThan(5000)

      // Cartão de crédito criado no perfil PJ não aparece ao consultar perfil Pessoal
      const cardPjRes = await app.request('/api/v1/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          name: 'Cartão Corp PJ',
          accountId: accPj.id,
          brand: 'visa',
          limitAmount: 10000,
          closingDay: 10,
          dueDay: 17,
          profileId: pjId
        })
      })
      expect(cardPjRes.status).toBe(201)

      const cardsPfRes = await app.request(`/api/v1/credit-cards?profileId=${personalId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const cardsPf = await cardsPfRes.json()
      expect(cardsPf.data.some((c: { name: string }) => c.name === 'Cartão Corp PJ')).toBe(false)

      const cardsPjRes = await app.request(`/api/v1/credit-cards?profileId=${pjId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const cardsPj = await cardsPjRes.json()
      expect(cardsPj.data.some((c: { name: string }) => c.name === 'Cartão Corp PJ')).toBe(true)

      // Orçamento criado no perfil PJ não vaza para perfil Pessoal
      const catId = '33333333-3333-4333-8333-333333333333'
      const budgetPjRes = await app.request('/api/v1/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          categoryId: catId,
          amountLimit: 3000,
          period: '2026-11',
          profileId: pjId
        })
      })
      expect(budgetPjRes.status).toBe(201)

      const budgetsPfRes = await app.request(`/api/v1/budgets?period=2026-11&profileId=${personalId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const budgetsPf = await budgetsPfRes.json()
      expect(budgetsPf.budgets).toHaveLength(0)

      const budgetsPjRes = await app.request(`/api/v1/budgets?period=2026-11&profileId=${pjId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      const budgetsPj = await budgetsPjRes.json()
      expect(budgetsPj.budgets).toHaveLength(1)

      // Relatório summary filtrado por pjId
      const reportPjRes = await app.request(`/api/v1/reports/summary?periodType=monthly&period=2026-11&profileId=${pjId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })
      expect(reportPjRes.status).toBe(200)
      const reportPj = await reportPjRes.json()
      expect(reportPj.kpis.transactionCount).toBe(1)

      // Cleanup mock stores criados neste teste
      mockAccountsStore.delete(accPersonal.id)
      mockAccountsStore.delete(accPj.id)
      for (const [txId, tx] of mockTransactionsStore.entries()) {
        if (tx.userId === userA) mockTransactionsStore.delete(txId)
      }
    })
  })
})
