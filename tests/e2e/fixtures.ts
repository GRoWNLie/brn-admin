import { test as base, Page } from '@playwright/test'

/**
 * Test fixtures — login akışı her testte tekrarlanmasın diye.
 *
 * Kullanım:
 *   test('benim test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/products')
 *     ...
 *   })
 *
 * Test kullanıcısı .env.test ile config edilebilir:
 *   TEST_USER_EMAIL=baran@sekerco.com
 *   TEST_USER_PASSWORD=admin
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'baran@sekerco.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'admin'

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    // Login sonrası dashboard'a yönlenmesini bekle
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15_000 })
    await use(page)
  },
})

export { expect } from '@playwright/test'
