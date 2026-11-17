import { test, expect } from '@playwright/test'

test.describe('Criação e Monitoramento de Envelopes de Orçamento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()
    await expect(page.getByTestId('main-balance-value')).toBeVisible()
  })

  test('Abertura do modal de orçamento a partir do widget no Dashboard', async ({ page }) => {
    const openBudgetBtn = page.getByTestId('open-budget-modal-btn').first()
    await expect(openBudgetBtn).toBeVisible()
    await openBudgetBtn.click()

    const modal = page.getByTestId('budget-modal')
    await expect(modal).toBeVisible()

    const closeBtn = page.getByTestId('btn-close-budget-modal')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('Configuração de teto para categoria, salvamento e renderização do envelope no Dashboard', async ({ page }) => {
    const openBudgetBtn = page.getByTestId('open-budget-modal-btn').first()
    await openBudgetBtn.click()

    const modal = page.getByTestId('budget-modal')
    await expect(modal).toBeVisible()

    const inputCat1 = page.getByTestId('input-budget-cat-1')
    await expect(inputCat1).toBeVisible()
    await inputCat1.click()
    await inputCat1.fill('250000')

    const saveBtn = page.getByTestId('btn-save-budget-cat-1')
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    const closeBtn = page.getByTestId('btn-close-budget-modal')
    await closeBtn.click()
    await expect(modal).not.toBeVisible()

    const envelopeCat1 = page.getByTestId('budget-envelope-cat-1')
    await expect(envelopeCat1).toBeVisible()
    await expect(envelopeCat1).toContainText('Alimentação')
  })
})
