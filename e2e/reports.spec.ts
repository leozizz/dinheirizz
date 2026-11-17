import { test, expect } from '@playwright/test'

test.describe('Exportação de Relatórios Financeiros Executivos e Contábeis (PDF / CSV) (#54)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()
    await expect(page.getByTestId('main-balance-value')).toBeVisible()
  })

  test('Abertura e fechamento do modal de exportação a partir do botão no Dashboard', async ({ page }) => {
    const exportBtn = page.getByTestId('dashboard-export-report-btn')
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    const modal = page.getByTestId('export-report-modal')
    await expect(modal).toBeVisible()

    const closeBtn = page.getByTestId('export-close-btn')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('Alternância entre formatos (PDF e CSV) e períodos (Mensal e Anual)', async ({ page }) => {
    const exportBtn = page.getByTestId('dashboard-export-report-btn')
    await exportBtn.click()

    const modal = page.getByTestId('export-report-modal')
    await expect(modal).toBeVisible()

    // Formato CSV
    const csvBtn = page.getByTestId('format-csv-btn')
    await csvBtn.click()
    await expect(page.getByTestId('export-submit-btn')).toContainText('Baixar Planilha CSV')

    // Formato PDF
    const pdfBtn = page.getByTestId('format-pdf-btn')
    await pdfBtn.click()
    await expect(page.getByTestId('export-submit-btn')).toContainText('Gerar & Imprimir PDF')

    // Alternar período para Anual
    const yearlyBtn = page.getByTestId('period-type-yearly-btn')
    await yearlyBtn.click()
    await expect(page.getByTestId('period-year-select')).toBeVisible()

    // Alternar período para Mensal
    const monthlyBtn = page.getByTestId('period-type-monthly-btn')
    await monthlyBtn.click()
    await expect(page.getByTestId('period-month-select')).toBeVisible()

    // Pré-visualização de KPIs visível
    await expect(page.getByTestId('export-preview-income')).toBeVisible()
    await expect(page.getByTestId('export-preview-expense')).toBeVisible()
    await expect(page.getByTestId('export-preview-net')).toBeVisible()
    await expect(page.getByTestId('export-preview-count')).toBeVisible()

    const cancelBtn = page.getByTestId('export-cancel-btn')
    await cancelBtn.click()
    await expect(modal).not.toBeVisible()
  })

  test('Responsividade sem overflow horizontal em viewport mobile e desktop', async ({ page }) => {
    const exportBtn = page.getByTestId('dashboard-export-report-btn')
    await exportBtn.click()

    const modal = page.getByTestId('export-report-modal')
    await expect(modal).toBeVisible()

    const isNoOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth
    })
    expect(isNoOverflow).toBe(true)
  })
})
