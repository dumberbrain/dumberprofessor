import { expect, test } from '@playwright/test';
import { expectAccessible } from './axe';

test('home lists the library by domain name and news newest first', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Təhlükəsizlik' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'English' })).toBeVisible();
  const news = main.locator('section[aria-labelledby="news"] li a');
  await expect(news).toHaveText(['Gündəlik hesabat — 2026-10-31', 'Gündəlik hesabat — 2026-10-29']);
  await expect(main.getByText('Metadatasız qeyd')).toBeVisible();
  await expect(main.getByText('README')).toHaveCount(0);
  await expectAccessible(page);
});
