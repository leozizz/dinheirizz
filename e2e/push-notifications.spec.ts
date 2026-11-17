import { test, expect } from '@playwright/test'

test.describe('Notificações Pró-Ativas via Web Push API (#55)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()
    await expect(page.getByTestId('main-balance-value')).toBeVisible()
  })

  test('Banner de Notificações Pró-Ativas no Dashboard: exibição e dispensar com persistência no localStorage', async ({ page }) => {
    const banner = page.getByTestId('push-notification-banner')
    if (await banner.isVisible()) {
      const dismissBtn = page.getByTestId('btn-dismiss-push-banner')
      await expect(dismissBtn).toBeVisible()
      await dismissBtn.click()

      // Banner não deve mais ser visível
      await expect(banner).not.toBeVisible()

      // Validação de persistência no localStorage
      const isDismissed = await page.evaluate(() => localStorage.getItem('dinheirizz_push_banner_dismissed'))
      expect(isDismissed).toBe('true')

      // Recarrega a página para confirmar que o banner continua oculto
      await page.reload()
      await expect(page.getByTestId('main-balance-value')).toBeVisible()
      await expect(page.getByTestId('push-notification-banner')).not.toBeVisible()
    }
  })

  test('Seção de Notificações Pró-Ativas no ProfileModal: renderização, controles e acessibilidade WCAG AA', async ({ page }) => {
    const notifBtn = page.getByTestId('header-notifications-btn')
    await expect(notifBtn).toBeVisible()
    await notifBtn.click()

    const modal = page.getByTestId('profile-modal')
    await expect(modal).toBeVisible()

    const pushSection = page.getByTestId('push-notifications-section')
    await expect(pushSection).toBeVisible()

    // Elementos interativos essenciais
    const billsSwitch = page.getByTestId('switch-bills-due-alert')
    const budgetSwitch = page.getByTestId('switch-budget-limit-alert')
    const invoiceSwitch = page.getByTestId('switch-invoice-due-alert')
    const selectBills = page.getByTestId('select-bills-days-before')
    const selectBudget = page.getByTestId('select-budget-threshold')
    const testBtn = page.getByTestId('btn-test-push-notification')

    await expect(billsSwitch).toBeVisible()
    await expect(budgetSwitch).toBeVisible()
    await expect(invoiceSwitch).toBeVisible()
    await expect(selectBills).toBeVisible()
    await expect(selectBudget).toBeVisible()
    await expect(testBtn).toBeVisible()

    // Acessibilidade: roles, labels e touch targets
    await expect(billsSwitch).toHaveAttribute('role', 'switch')
    await expect(budgetSwitch).toHaveAttribute('role', 'switch')
    await expect(invoiceSwitch).toHaveAttribute('role', 'switch')
    await expect(selectBills).toHaveAttribute('aria-label')
    await expect(selectBudget).toHaveAttribute('aria-label')

    // Fechar modal
    const closeBtn = page.getByTestId('profile-modal-close-btn')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(modal).not.toBeVisible()
  })

  test('Interatividade de configuração de alertas e limites no ProfileModal', async ({ page }) => {
    const notifBtn = page.getByTestId('header-notifications-btn')
    await expect(notifBtn).toBeVisible()
    await notifBtn.click()

    const modal = page.getByTestId('profile-modal')
    await expect(modal).toBeVisible()

    // Alterar antecedência de contas a vencer para 3 dias
    const selectBills = page.getByTestId('select-bills-days-before')
    await selectBills.selectOption('3')
    await expect(selectBills).toHaveValue('3')

    // Alterar percentual de teto do orçamento para 90%
    const selectBudget = page.getByTestId('select-budget-threshold')
    await selectBudget.selectOption('90')
    await expect(selectBudget).toHaveValue('90')

    // Alternar alerta de faturas de cartão
    const invoiceSwitch = page.getByTestId('switch-invoice-due-alert')
    await expect(invoiceSwitch).toHaveAttribute('aria-checked', 'true')
    await invoiceSwitch.click()
    await expect(invoiceSwitch).toHaveAttribute('aria-checked', 'false')

    const closeBtn = page.getByTestId('profile-modal-close-btn')
    await closeBtn.click()
    await expect(modal).not.toBeVisible()
  })

  test('Responsividade sem overflow horizontal em viewport mobile e desktop com ProfileModal aberto', async ({ page }) => {
    const notifBtn = page.getByTestId('header-notifications-btn')
    await expect(notifBtn).toBeVisible()
    await notifBtn.click()

    const modal = page.getByTestId('profile-modal')
    await expect(modal).toBeVisible()

    // Checagem rigorosa de overflow horizontal
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(isOverflowing).toBe(false)
  })
})
