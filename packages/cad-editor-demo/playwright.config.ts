import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`
const defaultChannel = process.platform === 'win32' ? 'msedge' : 'chrome'
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? defaultChannel

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    // Avoid accidentally reusing unrelated local processes that happen to bind the port.
    // We always start a dedicated Vite server for e2e to keep behavior stable across shells.
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: browserChannel }
    }
  ]
})
