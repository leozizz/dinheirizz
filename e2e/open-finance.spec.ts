import { test, expect } from '@playwright/test'

test.describe('Motor de Conexão Bancária via Open Finance Brasil (#84)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()
    await expect(page.getByTestId('main-balance-value')).toBeVisible()
  })

  test('Fluxo E2E: consentimento Somente Leitura, seleção de instituição, resumo e acessibilidade', async ({
    page,
    isMobile
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.route('**/api/v1/open-finance/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()

      if (method === 'POST' && url.pathname.endsWith('/open-finance/connect-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            connectToken: 'sandbox-token-e2e',
            provider: 'pluggy',
            mode: 'sandbox',
            consentScope: 'read_only',
            expiresAt: '2026-11-21T12:30:00.000Z'
          })
        })
        return
      }

      if (method === 'POST' && url.pathname.endsWith('/open-finance/connections')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            connection: {
              id: 'conn-e2e-1',
              provider: 'pluggy',
              externalItemId: 'sandbox-pluggy-201',
              institutionId: '201',
              institutionName: 'Nubank',
              status: 'active',
              consentScope: 'read_only',
              lastSyncAt: '2026-11-21T11:45:00.000Z',
              lastError: null,
              linkedAccounts: []
            },
            syncSummary: {
              accountsLinked: 1,
              transactionsImported: 4,
              duplicatesSkipped: 1,
              reconciledCount: 1
            }
          })
        })
        return
      }

      await route.fallback()
    })

    // Abrir ProfileModal (Desktop e Mobile)
    const triggerTestId = isMobile ? 'header-notifications-btn-mobile' : 'header-notifications-btn'
    await page.getByTestId(triggerTestId).click()
    await expect(page.getByTestId('profile-modal')).toBeVisible()
    await expect(page.getByTestId('open-finance-settings-section')).toBeVisible()

    // Abrir OpenFinanceModal
    await page.getByTestId('open-finance-connect-btn').click()
    const modal = page.getByTestId('open-finance-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toHaveAttribute('role', 'dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    await expect(modal).toHaveAttribute('aria-labelledby', 'open-finance-modal-title')

    // Checar zero overflow horizontal com o modal aberto
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(hasOverflow).toBe(false)

    // Etapa 1: Consentimento Somente Leitura e alternância de provedor
    await expect(page.getByTestId('open-finance-consent-step')).toBeVisible()
    const belvoBtn = page.getByTestId('open-finance-provider-belvo')
    await belvoBtn.click()
    await expect(belvoBtn).toHaveAttribute('aria-pressed', 'true')
    const pluggyBtn = page.getByTestId('open-finance-provider-pluggy')
    await pluggyBtn.click()
    await expect(pluggyBtn).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('open-finance-consent-continue-btn').click()

    // Etapa 2: Seleção de Instituição
    await expect(page.getByTestId('open-finance-connect-step')).toBeVisible()
    await page.getByTestId('open-finance-connect-submit-btn').click()

    // Etapa 3: Resumo de Conciliação
    await expect(page.getByTestId('open-finance-summary-step')).toBeVisible()
    await expect(page.getByText('Nubank conectado com sucesso')).toBeVisible()
    await page.getByTestId('open-finance-finish-btn').click()
    await expect(modal).not.toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
