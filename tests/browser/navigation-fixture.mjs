import {expect} from '@playwright/test';

export async function openMapGroupFor(page, name) {
  const group = ['Counts', 'List', 'Viewport scores'].includes(name) ? 'Analysis'
    : ['Links', 'Markers'].includes(name) ? 'Draw tools' : null;
  if (!group) return;
  const toggle = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: group, exact: true});
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(page.getByRole('group', {name: group, exact: true})).toBeVisible();
}

export async function openPanel(page, menu, name) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  if (name) {
    await openMapGroupFor(page, name);
    const tab = page.locator('.iitc-iris-sheet-tabbar').getByRole('button', {name, exact: true});
    if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click();
  }
  return page.locator('aside:visible');
}

export const waitForMapFrames = page => page.evaluate(() =>
  new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
