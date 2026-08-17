import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const HOST = '127.0.0.1';

/**
 * E2E runs against the PRODUCTION build served by `astro preview` — the same
 * artifact that ships. `--host` so the preview is reachable from another
 * machine while you watch it; Playwright itself connects over loopback.
 *
 * Set PW_SKIP_BUILD=1 to reuse an existing dist/ instead of rebuilding.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: process.env.PW_SKIP_BUILD
      ? `npx astro preview --host --port ${PORT}`
      : `npm run build && npx astro preview --host --port ${PORT}`,
    url: `http://${HOST}:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
