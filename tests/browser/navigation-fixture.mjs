import {expect} from '@playwright/test';

export async function openMapGroupFor(page, name) {
  const group = ['Counts', 'List', 'Viewport scores'].includes(name) ? 'Analysis'
    : ['Links', 'Markers'].includes(name) ? 'Draw tools' : null;
  if (!group) return;
  const toggle = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: group, exact: true});
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(page.getByRole('group', {name: group, exact: true})).toBeVisible();
}
