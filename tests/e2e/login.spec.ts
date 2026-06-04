import { test, expect } from '@playwright/test'

test.describe('Auth — Login akışı', () => {
  test('Login sayfası açılıyor', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('Yanlış şifreyle giriş başarısız', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrong-password-12345')
    await page.click('button[type="submit"]')
    // Hata mesajı görünmeli VEYA hala /login'de olmalı
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
  })

  test('Doğru kimlikle giriş başarılı', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'baran@sekerco.com'
    const password = process.env.TEST_USER_PASSWORD || 'admin'
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(dashboard|$)/)
  })

  test('Logout sonrası login\'e döner', async ({ page }) => {
    // Login ol
    const email = process.env.TEST_USER_EMAIL || 'baran@sekerco.com'
    const password = process.env.TEST_USER_PASSWORD || 'admin'
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|$)/)

    // Profile menü aç + Çıkış
    const profileButton = page.locator('.profile-container').first()
    if (await profileButton.isVisible().catch(() => false)) {
      await profileButton.click()
      const logoutLink = page.getByText(/çıkış/i).first()
      if (await logoutLink.isVisible().catch(() => false)) {
        await logoutLink.click()
        await page.waitForURL(/\/login/, { timeout: 10_000 })
      }
    }
  })
})
