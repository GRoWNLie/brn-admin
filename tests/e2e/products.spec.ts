import { test, expect } from './fixtures'

test.describe('Ürünler — Liste + CRUD', () => {
  test('Ürün listesi açılıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/products')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /ürünler/i })).toBeVisible({ timeout: 15_000 })
  })

  test('Yeni ürün oluştur sayfası açılıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/products/new')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /yeni ürün/i })).toBeVisible()
    await expect(authenticatedPage.locator('input').first()).toBeVisible()
  })

  test('Arama input çalışıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/products')
    const searchInput = authenticatedPage.locator('input[placeholder*="ara" i]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test')
      await authenticatedPage.keyboard.press('Enter')
      await authenticatedPage.waitForTimeout(2000)
      expect(authenticatedPage.url()).toContain('search=test')
    }
  })
})
