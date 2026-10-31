import { expect, test } from '@playwright/test';
import { expectAccessible } from './axe';

test('unknown and out-of-library paths show the not-found page', async ({ page }) => {
  for (const path of ['/docs/nope', '/docs/..%2F..%2Fpackage']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Sənəd tapılmadı' })).toBeVisible();
  }
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Ana səhifəyə qayıt' }).click();
  await expect(page).toHaveURL(/\/$/);
});
