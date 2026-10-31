import { expect, test } from '@playwright/test';
import { expectAccessible } from './axe';

test('theme follows the system first and remembers the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('combobox', { name: 'Tema' }).selectOption('light');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('light');
});

test('keyboard users can skip to the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Məzmuna keç' })).toBeFocused();
});

test('dark theme keeps contrast on a document with code', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/docs/security/lessons/2026-10-30-xss-basics');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expectAccessible(page);
});
