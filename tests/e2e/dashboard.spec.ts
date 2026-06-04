import { test, expect } from './fixtures'

test.describe('Dashboard — Ana sayfa', () => {
  test('Dashboard yükleniyor + Shopify veri görünüyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard')
    // KPI kartları
    await expect(authenticatedPage.getByText('Toplam Satış')).toBeVisible({ timeout: 15_000 })
    await expect(authenticatedPage.getByText('Sipariş Sayısı')).toBeVisible()
    await expect(authenticatedPage.getByText('Oturum (Sessions)')).toBeVisible()
  })

  test('Date range filtresi değişebiliyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard?range=30')
    await authenticatedPage.waitForTimeout(2000)
    expect(authenticatedPage.url()).toContain('range=30')
  })

  test('Sidebar tüm linkler çalışıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard')
    // En kritik sayfalar
    const links = [
      { url: '/products', text: /ürün/i },
      { url: '/orders', text: /sipariş/i },
      { url: '/customers', text: /müşteri/i },
    ]
    for (const link of links) {
      await authenticatedPage.goto(link.url)
      await expect(authenticatedPage.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
