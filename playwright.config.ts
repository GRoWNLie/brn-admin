import { defineConfig, devices } from '@playwright/test'

/**
 * BRN Admin — E2E test konfigürasyonu
 *
 * Çalıştırma:
 *   npx playwright test                  → headless tüm testler
 *   npx playwright test --ui             → UI mode (görsel)
 *   npx playwright test --debug          → step-by-step debug
 *   npx playwright test login.spec.ts    → sadece login testleri
 *
 * Kurulum:
 *   npm install -D @playwright/test
 *   npx playwright install
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // dev server tekildeki için seri çalış
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'tr-TR',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Auto-start dev server if not running (sadece local'de)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 60_000,
    reuseExistingServer: true,
  },
})
