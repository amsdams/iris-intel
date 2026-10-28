import {test, expect} from '@playwright/test';

const optionalPanels = ['Counts', 'List', 'Scoreboard', 'Links', 'Markers'];
const optionalIds = ['portalCounts', 'portalsList', 'scoreboard', 'drawLinks', 'drawMarkers'];
const secondary = page => page.locator('.iitc-iris-sheet-tabbar-secondary');
async function open(page, menu, panel) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  if (panel) {
    const tab = secondary(page).getByRole('button', {name: panel, exact: true});
    if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click();
  }
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
});

test('optional panels default to visible, persist independently of drawings/layers, and restore together', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('panel-visibility-seeded')) return;
    sessionStorage.setItem('panel-visibility-seeded', 'true');
    localStorage.setItem('plugin-draw-tools-layer', JSON.stringify([
      {type: 'marker', latLng: {lat: 52, lng: 4}, color: '#ff0000', label: 'Saved marker'},
      {type: 'polyline', latLngs: [{lat: 52, lng: 4}, {lat: 52.01, lng: 4.01}], color: '#ff0000'},
    ]));
    localStorage.setItem('iitc-iris:layer-settings', JSON.stringify({drawnLinks: true, drawnMarkers: true, labels: true}));
  });
  await page.goto('/');
  await open(page, 'Map', 'Display');
  for (const name of optionalPanels) await expect(secondary(page).getByRole('button', {name, exact: true})).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers?.drawnItems.length)).toBe(2);
  const original = await page.evaluate(() => {
    return {drawings: localStorage.getItem('plugin-draw-tools-layer'), layers: localStorage.getItem('iitc-iris:layer-settings')};
  });
  await open(page, 'System', 'Panels');
  const settings = page.getByRole('complementary', {name: 'Panel settings'});
  await expect(settings.getByRole('button', {name: 'Restore defaults'})).toBeDisabled();
  for (const name of optionalPanels) {
    await expect(settings.getByRole('checkbox', {name, exact: true})).toBeChecked();
    await settings.getByRole('checkbox', {name, exact: true}).uncheck();
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iitc-iris:hidden-panels')))).toEqual(optionalIds);
  expect(await page.evaluate(() => ({drawings: localStorage.getItem('plugin-draw-tools-layer'), layers: localStorage.getItem('iitc-iris:layer-settings')}))).toEqual(original);
  // Ordinary entity refreshes may recreate drawing layers; visibility and stored data must survive.
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.drawnItems
    .filter(layer => window.__iitcIrisMap.hasLayer(layer)).length)).toBe(2);
  await testInfo.attach('panel-settings', {body: await page.screenshot(), contentType: 'image/png'});
  await page.reload();
  await expect(settings).toBeVisible();
  for (const name of optionalPanels) await expect(settings.getByRole('checkbox', {name, exact: true})).not.toBeChecked();
  await settings.getByRole('button', {name: 'Close panels', exact: true}).click();
  await page.keyboard.press('m');
  await expect(page.locator('.iitc-iris-shell')).toHaveClass(/iitc-iris-sheet-layers(?:\s|$)/);
  for (const name of optionalPanels) await expect(secondary(page).getByRole('button', {name, exact: true})).toHaveCount(0);
  for (const name of ['Search', 'Display', 'Controls', 'Missions', 'Scores']) {
    await expect(secondary(page).getByRole('button', {name, exact: true})).toBeVisible();
  }
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers?.drawnItems.length)).toBe(2);
  await open(page, 'System', 'Panels');
  await settings.getByRole('button', {name: 'Restore defaults'}).click();
  for (const name of optionalPanels) await expect(settings.getByRole('checkbox', {name, exact: true})).toBeChecked();
  await page.reload();
  await open(page, 'Map', 'Display');
  for (const name of optionalPanels) await expect(secondary(page).getByRole('button', {name, exact: true})).toBeVisible();
  await secondary(page).getByRole('button', {name: 'Markers', exact: true}).click();
  await expect(page.getByText('Saved marker', {exact: true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('a hidden saved panel falls back to the map and malformed preferences cannot hide baseline panels', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('iitc-iris:active-sheet', 'drawMarkers');
    localStorage.setItem('iitc-iris:hidden-panels', JSON.stringify(['drawMarkers', 'layers', 'panelSettings', 'unknown']));
  });
  await page.goto('/');
  await expect(page.locator('.iitc-iris-shell')).toHaveClass(/iitc-iris-sheet-map(?:\s|$)/);
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await open(page, 'Map', 'Display');
  await expect(secondary(page).getByRole('button', {name: 'Markers', exact: true})).toHaveCount(0);
  await open(page, 'System', 'Panels');
  const settings = page.getByRole('complementary', {name: 'Panel settings'});
  await expect(settings).toBeVisible();
  await expect(settings.getByRole('checkbox')).toHaveCount(5);
  await expect(settings.getByRole('checkbox', {name: 'Markers', exact: true})).not.toBeChecked();
  await expect(settings.getByRole('checkbox', {name: 'Links', exact: true})).toBeChecked();
});
