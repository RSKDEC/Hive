import { expect, test } from '@playwright/test';
import { SCRIPTED_WIN } from '../src/engine/__tests__/scripted-game';
import { playAction } from './helpers';

test('pass-and-play: a complete game on one device, saved across reloads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pondlife' })).toBeVisible();
  await page.getByRole('link', { name: /Play on One Device/ }).click();
  await page.getByPlaceholder('Sun (goes first)').fill('Ana');
  await page.getByPlaceholder('Moon').fill('Ben');
  await page.getByTestId('start-local').click();
  await expect(page.getByTestId('status')).toContainText('Ana');

  // Illegal: the Turtle can't be the first tile.
  await page.locator('button[data-bug="turtle"]:not([disabled]):visible').first().click();
  await expect(page.getByRole('status').filter({ hasText: 'very first tile' })).toBeVisible();

  for (const [i, a] of SCRIPTED_WIN.entries()) {
    if (i === 6) {
      // Refresh mid-game: the game is restored from browser storage.
      await page.reload();
      await page.getByRole('button', { name: /Continue Ana vs Ben/ }).click();
      await expect(page.locator('[data-piece]')).toHaveCount(6);
    }
    await playAction(page, a);
  }
  await expect(page.getByTestId('game-over')).toContainText('Ana wins!');
});

test('rules guide renders with movement demos', async ({ page }) => {
  await page.goto('/rules');
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Otter/ })).toBeVisible();
});

test('computer opponent replies to a move', async ({ page }) => {
  await page.goto('/computer');
  await page.getByTestId('start-ai').click();
  await page.locator('button[data-bug="frog"]:not([disabled]):visible').first().click();
  await page.locator('[data-target="0,0"]').click();
  await expect(page.locator('[data-piece]')).toHaveCount(2, { timeout: 15000 });
  await expect(page.getByTestId('status')).toContainText('Your turn');
});
