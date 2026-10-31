import { expect, test } from '@playwright/test';
import { expectAccessible } from './axe';

test('a lesson renders as an article with working links and code copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/security/lessons/2026-10-30-xss-basics');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'XSS basics' })).toBeVisible();
  await expect(main.getByRole('table')).toBeVisible();
  await expect(main.getByRole('link', { name: 'OWASP', exact: true })).toHaveAttribute('target', '_blank');
  await main.getByRole('button', { name: 'Kodu kopyala' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('const html');
  await expectAccessible(page);
  await main.getByRole('link', { name: 'CSP', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/security\/research\/2026-10-31-csp$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Content Security Policy' })).toBeVisible();
});

test('untrusted content never executes', async ({ page }) => {
  let dialog = false;
  page.on('dialog', async (d) => {
    dialog = true;
    await d.dismiss();
  });
  await page.goto('/docs/malicious');
  await expect(page.getByRole('heading', { level: 1, name: 'Malicious' })).toBeVisible();
  await expect(page.locator('article script, article [onerror], article a[href^="javascript:"]')).toHaveCount(0);
  await page.getByRole('main').getByText('click').click();
  expect(dialog).toBe(false);
});

test('pages carry a CSP with a nonce', async ({ request }) => {
  const response = await request.get('/');
  const csp = response.headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
});
