import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /autentificare/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    // Click submit without filling form
    await page.click('button[type="submit"]')

    // Should see browser validation
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeFocused()
  })

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await page.click('text=Creează cont nou')

    await expect(page).toHaveURL('/auth/register')
    await expect(page.locator('h1')).toContainText(/Creare Cont/i)
  })

  test('should navigate to forgot password page', async ({ page }) => {
    // Click forgot password link
    await page.click('text=Ai uitat parola?')

    await expect(page).toHaveURL('/auth/forgot-password')
  })

  test('should attempt login with credentials', async ({ page }) => {
    // Fill in form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    // Submit form
    await page.click('button[type="submit"]')

    // Should either show error or redirect to dashboard
    // (depends on if test user exists in database)
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    const hasError = await page.locator('text=/Email sau parolă/i').isVisible().catch(() => false)

    expect(currentUrl === '/dashboard' || hasError).toBeTruthy()
  })
})

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
  })

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[type="email"]', 'newuser@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'different')

    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=/parolele nu se potrivesc/i')).toBeVisible()
  })
})
