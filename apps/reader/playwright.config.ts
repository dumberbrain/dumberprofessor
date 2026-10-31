import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const fixtures = (path: string) => fileURLToPath(new URL(`./e2e/fixtures/${path}`, import.meta.url));
const port = 3110; // not 3100, so a running reader does not clash

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DOCUMENTS_DIR: fixtures('documents'), PROFESSOR_CONFIG: fixtures('professor.json') },
  },
});
