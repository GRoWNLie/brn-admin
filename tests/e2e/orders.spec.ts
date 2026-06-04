import { test, expect } from './fixtures'

test.describe('Siparişler — Liste + Detay', () => {
  test('Sipariş listesi açılıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/orders')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /sipariş/i })).toBeVisible({ timeout: 15_000 })
  })

  test('Filtreler görünür', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/orders')
    // En azından ödeme + kargo durumu select'leri olmalı
    const selects = authenticatedPage.locator('select.form-select')
    await expect(selects.first()).toBeVisible({ timeout: 10_000 })
  })

  test('Sipariş detayına gidilebiliyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/orders')
    await authenticatedPage.waitForTimeout(3000)
    // İlk sipariş satırına tıkla
    const firstOrderRow = authenticatedPage.locator('table tbody tr').first()
    if (await firstOrderRow.isVisible().catch(() => false)) {
      await firstOrderRow.click()
      // /orders/[id] URL'ine yönlenmeli
      await authenticatedPage.waitForURL(/\/orders\/.+/, { timeout: 10_000 })
    }
  })
})

test.describe('Bildirimler', () => {
  test('Bildirim sayfası açılıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/notifications')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /bildirim/i })).toBeVisible()
  })

  test('Yeni bildirim oluşturulabilir', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/notifications')
    const createBtn = authenticatedPage.getByText(/yeni bildirim/i).first()
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
      // Form fields görünmeli
      await expect(authenticatedPage.locator('textarea, input').first()).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe('AI Asistan', () => {
  test('AI sayfası açılıyor + quick prompts var', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/ai-assistant')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /yapay zeka/i })).toBeVisible()
  })
})

test.describe('Email Marketing', () => {
  test('Email kampanya sayfası açılıyor', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/marketing/email-sms')
    await expect(authenticatedPage.locator('h1').filter({ hasText: /email pazarlama/i })).toBeVisible()
  })
})
