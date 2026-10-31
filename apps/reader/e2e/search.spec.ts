import { expect, test } from '@playwright/test';
import { expectAccessible } from './axe';

test('search from the URL with Azerbaijani case rules and filters', async ({ page }) => {
  await page.goto('/search?q=%C5%9E%C6%8FRT');
  const results = page.getByRole('main').getByRole('listitem');
  await expect(results.first()).toContainText('XSS basics');
  await expect(page.getByRole('main').locator('mark').first()).toBeVisible();
  await expectAccessible(page);

  await page.goto('/search?q=%C5%9F%C9%99rt&type=news');
  await expect(page.getByText('Heç nə tapılmadı.')).toBeVisible();
});

test('the search form submits to a shareable URL', async ({ page }) => {
  await page.goto('/search');
  const form = page.getByRole('search', { name: 'Filtrli axtarış' });
  await form.getByRole('searchbox').fill('nonce');
  await form.getByRole('combobox', { name: 'Tip' }).selectOption('research');
  await form.getByRole('button', { name: 'Axtar' }).click();
  await expect(page).toHaveURL(/q=nonce.*type=research/);
  await expect(page.getByRole('main').getByRole('link', { name: 'Content Security Policy' })).toBeVisible();
});
