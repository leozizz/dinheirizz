import { test, expect } from '@playwright/test'

const parseCurrency = (text: string): number => {
  const clean = text.replace(/[^\d,-]/g, '').replace(',', '.')
  return parseFloat(clean) || 0
}

test.describe('Registro de Transações e Atualização de Saldo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()
    await expect(page.getByTestId('main-balance-value')).toBeVisible()
  })

  test('Abertura e fechamento do modal de transação via ação rápida', async ({ page }) => {
    const quickActionIncome = page.getByTestId('quick-action-income')
    await expect(quickActionIncome).toBeVisible()
    await quickActionIncome.click()

    const amountInput = page.getByTestId('transaction-amount-input')
    await expect(amountInput).toBeVisible()

    const closeBtn = page.getByTestId('close-transaction-modal-btn')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(amountInput).not.toBeVisible()
  })

  test('Registro de nova receita com atualização do saldo e listagem recente', async ({ page }) => {
    const mainBalance = page.getByTestId('main-balance-value')
    const initialText = await mainBalance.innerText()
    const initialBalance = parseCurrency(initialText)

    const quickActionIncome = page.getByTestId('quick-action-income')
    await quickActionIncome.click()

    const amountInput = page.getByTestId('transaction-amount-input')
    await amountInput.fill('1500,00')

    const descInput = page.getByTestId('transaction-description-input')
    await descInput.fill('Consultoria Freelance E2E')

    const submitBtn = page.getByTestId('transaction-submit-btn')
    await submitBtn.click()

    await expect(page.getByText('Consultoria Freelance E2E').first()).toBeVisible()

    await expect(async () => {
      const currentText = await mainBalance.innerText()
      const currentBalance = parseCurrency(currentText)
      expect(currentBalance).toBeGreaterThan(initialBalance)
    }).toPass({ timeout: 5000 })
  })

  test('Registro de nova despesa com abatimento do saldo principal', async ({ page }) => {
    const mainBalance = page.getByTestId('main-balance-value')
    const initialText = await mainBalance.innerText()
    const initialBalance = parseCurrency(initialText)

    const quickActionExpense = page.getByTestId('quick-action-expense')
    await quickActionExpense.click()

    const amountInput = page.getByTestId('transaction-amount-input')
    await amountInput.fill('300,00')

    const descInput = page.getByTestId('transaction-description-input')
    await descInput.fill('Almoço de Negócios E2E')

    const submitBtn = page.getByTestId('transaction-submit-btn')
    await submitBtn.click()

    await expect(page.getByText('Almoço de Negócios E2E').first()).toBeVisible()

    await expect(async () => {
      const currentText = await mainBalance.innerText()
      const currentBalance = parseCurrency(currentText)
      expect(currentBalance).toBeLessThan(initialBalance)
    }).toPass({ timeout: 5000 })
  })
})
