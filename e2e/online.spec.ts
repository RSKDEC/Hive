import { expect, test, type Page } from '@playwright/test';
import { SCRIPTED_WIN } from '../src/engine/__tests__/scripted-game';
import { playAction } from './helpers';

async function waitForMyTurn(page: Page) {
  await expect(page.getByTestId('status')).toHaveText(/Your turn/, { timeout: 15000 });
}

test('two players on different devices play a full private game', async ({ browser }) => {
  const ana = await (await browser.newContext()).newPage();
  const ben = await (await browser.newContext()).newPage();
  const eve = await (await browser.newContext()).newPage();

  // Ana creates a game as Sun.
  await ana.goto('/online');
  await ana.getByTestId('nickname').fill('Ana');
  await ana.getByRole('button', { name: 'Sun (first)' }).click();
  await ana.getByTestId('create-game').click();
  await expect(ana.getByTestId('invite-link')).toHaveValue(/\/g\//);
  const link = await ana.getByTestId('invite-link').inputValue();
  expect(link).toMatch(/\/g\/[A-Za-z0-9]+$/);
  expect(link).not.toContain('secret');

  // Ben opens the link and joins; the game starts automatically for both.
  await ben.goto(link);
  await expect(ben.getByRole('heading', { name: /Ana invited you/ })).toBeVisible();
  await ben.getByTestId('nickname').fill('Ben');
  await ben.getByTestId('join-game').click();
  await waitForMyTurn(ana);
  await expect(ben.getByTestId('status')).toContainText('Waiting for Ana');

  // A third person with the link can only watch.
  await eve.goto(link);
  await expect(eve.getByTestId('status')).toContainText('Watching');
  await expect(eve.locator('button[data-bug]:not([disabled])')).toHaveCount(0);

  for (const [i, a] of SCRIPTED_WIN.entries()) {
    const page = i % 2 === 0 ? ana : ben;
    if (i === 4) {
      // Ben refreshes the page mid-game and keeps his seat.
      await ben.reload();
      await expect(ben.getByTestId('status')).toContainText('Waiting for Ana');
    }
    if (i === 6) {
      // Ben loses connection briefly; Ana keeps playing; Ben catches up after reconnecting.
      await ben.context().setOffline(true);
    }
    await waitForMyTurn(page);
    await playAction(page, a);
    if (i === 6) await ben.context().setOffline(false);
    // Both boards stay in sync.
    await expect(ana.locator('[data-piece]')).toHaveCount(i < 8 ? i + 1 : 8 + Math.ceil((i - 8) / 2), { timeout: 15000 });
    await expect(ben.locator('[data-piece]')).toHaveCount(i < 8 ? i + 1 : 8 + Math.ceil((i - 8) / 2), { timeout: 15000 });
  }

  await expect(ana.getByTestId('game-over')).toContainText('Ana wins!', { timeout: 15000 });
  await expect(ben.getByTestId('game-over')).toContainText('Ana wins!', { timeout: 15000 });
  await expect(eve.getByTestId('game-over')).toContainText('Ana wins!', { timeout: 15000 });

  // Rematch with colours swapped.
  await ben.getByTestId('game-over').getByRole('button', { name: 'Rematch' }).click();
  await expect(ben).not.toHaveURL(link);
  await expect(ben.getByTestId('status')).toContainText('Your turn', { timeout: 15000 }); // Ben is Sun now
  await ana.getByTestId('game-over').getByRole('button', { name: 'Go to rematch' }).click();
  await expect(ana.getByTestId('status')).toContainText('Waiting for Ben');
});

test('take-back requires the opponent to accept', async ({ browser }) => {
  const ana = await (await browser.newContext()).newPage();
  const ben = await (await browser.newContext()).newPage();
  await ana.goto('/online');
  await ana.getByTestId('nickname').fill('Ana');
  await ana.getByRole('button', { name: 'Sun (first)' }).click();
  await ana.getByTestId('create-game').click();
  await expect(ana.getByTestId('invite-link')).toHaveValue(/\/g\//);
  const link = await ana.getByTestId('invite-link').inputValue();
  await ben.goto(link);
  await ben.getByTestId('nickname').fill('Ben');
  await ben.getByTestId('join-game').click();
  await waitForMyTurn(ana);
  await playAction(ana, SCRIPTED_WIN[0]);
  await ana.getByRole('button', { name: 'Ask to take back' }).click();
  await ben.getByTestId('accept-offer').click();
  await expect(ana.locator('[data-piece]')).toHaveCount(0, { timeout: 15000 });
  await waitForMyTurn(ana);
});
