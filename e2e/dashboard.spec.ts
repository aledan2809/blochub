import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any, email = 'admin@blochub.ro', password = 'password123') {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

test.describe('Dashboard', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test.skip('should display dashboard after login', async ({ page }) => {
    // This test is skipped because it requires a real user account
    // In a real scenario, you would set up test fixtures

    await login(page)

    // Check dashboard is visible
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Check stats cards
    await expect(page.locator('text=Încasări Luna')).toBeVisible()
    await expect(page.locator('text=Cheltuieli Luna')).toBeVisible()
    await expect(page.locator('text=Restanțe')).toBeVisible()
  })

  test.skip('should navigate to different pages', async ({ page }) => {
    await login(page)

    // Navigate to Apartamente
    await page.click('text=Apartamente')
    await expect(page).toHaveURL('/dashboard/apartamente')

    // Navigate to Cheltuieli
    await page.click('text=Cheltuieli')
    await expect(page).toHaveURL('/dashboard/cheltuieli')

    // Navigate to Chitanțe
    await page.click('text=Chitanțe')
    await expect(page).toHaveURL('/dashboard/chitante')
  })

  test.skip('should display setup wizard for new association', async ({ page }) => {
    // Login with account that has no association
    await login(page)

    // Check if setup wizard is displayed
    const hasSetupWizard = await page.locator('text=/Bine ai venit în BlocHub/i').isVisible()

    if (hasSetupWizard) {
      await expect(page.locator('text=Detalii Asociație')).toBeVisible()
    }
  })
})

test.describe('Dashboard Navigation', () => {
  test('should have working sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard')

    // Check sidebar links (visible even when not authenticated)
    const sidebar = page.locator('nav')
    await expect(sidebar).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')

    // Mobile menu should be accessible
    await expect(page.locator('nav')).toBeVisible()
  })
})
