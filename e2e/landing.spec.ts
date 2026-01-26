import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/BlocHub/)

    // Check hero section
    await expect(page.locator('h1')).toContainText('Administrare Blocuri')

    // Check CTA buttons
    const ctaButton = page.getByRole('link', { name: /Începe Gratuit/i })
    await expect(ctaButton).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')

    // Click login button
    await page.click('text=Autentificare')

    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login')
    await expect(page.locator('h1')).toContainText(/Bine ai revenit/i)
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/')

    // Click register button
    await page.click('text=Începe Gratuit')

    // Should redirect to register page
    await expect(page).toHaveURL('/auth/register')
  })

  test('should display features section', async ({ page }) => {
    await page.goto('/')

    // Check features
    await expect(page.locator('text=AI Agents')).toBeVisible()
    await expect(page.locator('text=Automatizare')).toBeVisible()
    await expect(page.locator('text=Plăți Online')).toBeVisible()
  })

  test('should display pricing section', async ({ page }) => {
    await page.goto('/')

    // Scroll to pricing
    await page.locator('text=Prețuri Simple').scrollIntoViewIfNeeded()

    // Check pricing tiers
    await expect(page.locator('text=Free')).toBeVisible()
    await expect(page.locator('text=Pro')).toBeVisible()
    await expect(page.locator('text=Enterprise')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check mobile menu
    await expect(page.locator('nav')).toBeVisible()

    // Check hero is visible
    await expect(page.locator('h1')).toBeVisible()
  })
})
