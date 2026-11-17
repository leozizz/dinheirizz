import { test, expect } from '@playwright/test'

test.describe('Autenticação, Demonstração, Dual-Theme e Responsividade', () => {
  test('Navegação da tela de boas-vindas para login e alternância de abas', async ({ page }) => {
    await page.goto('/')

    const welcomeLoginBtn = page.getByTestId('welcome-login-btn')
    await expect(welcomeLoginBtn).toBeVisible()
    await welcomeLoginBtn.click()

    const tabLogin = page.getByTestId('tab-login')
    const tabSignup = page.getByTestId('tab-signup')
    await expect(tabLogin).toBeVisible()
    await expect(tabSignup).toBeVisible()

    const emailInput = page.getByTestId('auth-email-input')
    const passwordInput = page.getByTestId('auth-password-input')
    const fullNameInput = page.getByTestId('auth-fullname-input')
    const usernameInput = page.getByTestId('auth-username-input')
    const confirmPasswordInput = page.getByTestId('auth-confirm-password-input')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(fullNameInput).not.toBeVisible()

    await tabSignup.click()
    await expect(fullNameInput).toBeVisible()
    await expect(usernameInput).toBeVisible()
    await expect(confirmPasswordInput).toBeVisible()

    await tabLogin.click()
    await expect(fullNameInput).not.toBeVisible()
    await expect(emailInput).toBeVisible()
  })

  test('Entrada direta no Dashboard através do Modo Demonstração', async ({ page }) => {
    await page.goto('/')

    const demoBtn = page.getByTestId('welcome-demo-btn')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()

    const mainBalance = page.getByTestId('main-balance-value')
    await expect(mainBalance).toBeVisible()
    await expect(mainBalance).toContainText('R$')
  })

  test('Alternância de Dual-Theme na Landing Page e no Header do Dashboard', async ({ page }) => {
    await page.goto('/')

    const htmlLocator = page.locator('html')
    await expect(htmlLocator).toHaveClass(/dark/)

    const landingThemeToggle = page.getByTestId('landing-theme-toggle-btn')
    await expect(landingThemeToggle).toBeVisible()
    await landingThemeToggle.click()
    await expect(htmlLocator).toHaveClass(/light/)

    await landingThemeToggle.click()
    await expect(htmlLocator).toHaveClass(/dark/)

    const demoBtn = page.getByTestId('welcome-demo-btn')
    await demoBtn.click()

    const headerThemeToggle = page.getByTestId('header-theme-toggle-btn')
    await expect(headerThemeToggle).toBeVisible()
    await headerThemeToggle.click()
    await expect(htmlLocator).toHaveClass(/light/)
  })

  test('Ausência de overflow horizontal na aplicação', async ({ page }) => {
    await page.goto('/')

    const landingHasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(landingHasOverflow).toBe(false)

    const demoBtn = page.getByTestId('welcome-demo-btn')
    await demoBtn.click()

    await expect(page.getByTestId('main-balance-value')).toBeVisible()

    const dashboardHasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(dashboardHasOverflow).toBe(false)
  })
})
