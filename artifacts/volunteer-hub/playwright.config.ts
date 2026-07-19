import { defineConfig, devices } from '@playwright/test';

// Use the Nix-provided Chromium (NixOS-native, no missing-library issues).
// Fall back to searching $PATH if the env var is not set.
import { execSync } from 'child_process';
function findChromium(): string {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) return process.env.CHROMIUM_EXECUTABLE_PATH;
  try { return execSync('which chromium', { encoding: 'utf8' }).trim(); } catch {}
  try { return execSync('which chromium-browser', { encoding: 'utf8' }).trim(); } catch {}
  return 'chromium';
}
const CHROMIUM_EXEC = findChromium();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: CHROMIUM_EXEC,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'PORT=5174 BASE_PATH=/ pnpm run dev',
    port: 5174,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: '5174',
      BASE_PATH: '/',
    },
  },
});
