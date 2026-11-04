import { expect, type Page } from '@playwright/test';
import type { Action } from '../src/engine/types';

async function clickCenter(page: Page, selector: string) {
  const el = page.locator(selector).last();
  await expect(el).toBeVisible();
  const box = (await el.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Plays one action through the UI exactly as a person would: tap a tray creature or tile, then a highlighted space. */
export async function playAction(page: Page, a: Action) {
  if (a.type === 'place') {
    await page.locator(`button[data-bug="${a.bug}"]:not([disabled]):visible`).first().click();
  } else if (a.type === 'move') {
    await clickCenter(page, `[data-hex="${a.from}"]`);
  } else return;
  await clickCenter(page, `[data-target="${a.to}"]`);
  // The tile appears at its destination.
  await expect(page.locator(`[data-hex="${a.to}"]`).first()).toBeAttached();
}
