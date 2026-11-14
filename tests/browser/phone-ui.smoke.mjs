import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';
import {openMapGroupFor} from './navigation-fixture.mjs';

test.use({hasTouch: true});
test.beforeEach(installPortalFixture);

for (const width of [320, 412]) {
  test(`portal actions, expansion and map return preserve the phone reading position (${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 780});
    await setupPortalMap(page);
    await selectPortal(page, 'alpha');
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    const panel = page.getByRole('complementary', {name: 'Selected portal details'});
    const summary = panel.locator('.iitc-iris-portal-summary');
    await expect(summary).toContainText('Unknown');
    expect(await panel.locator('.iitc-iris-portal-glance').evaluate(element =>
      [element.previousElementSibling.previousElementSibling, element.previousElementSibling].map(section => section.querySelector('summary').textContent)))
      .toEqual(['Mods', 'Resonators']);
    await expect(panel.getByText('Resistance', {exact: true})).toBeVisible();
    await expect(panel.getByRole('button', {name: 'Zoom', exact: true})).toBeVisible();
    for (const action of ['Zoom', 'Navigate', 'Share']) {
      const button = panel.getByRole('button', {name: action, exact: true});
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    // Publish already loaded inventory through the existing UI boundary; no inventory RPC is installed.
    await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_INVENTORY_STATUS', inventory: {
      status: 'ready', requestState: 'ready', items: 3, keys: 3, portalsWithKeys: 1, capsules: 0,
      selectedPortalGuid: 'alpha', portalKeysForSelectedPortal: {total: 3, capsule: 0, loose: 3, capsules: {}},
    }}, '*'));
    await expect(summary).not.toContainText('Unknown');
    await expect(summary.locator('.iitc-iris-summary-cell').filter({hasText: 'keys'})).toContainText('3');
    await panel.getByRole('button', {name: 'Navigate', exact: true}).click();
    await expect(panel.getByRole('region', {name: 'Navigate to portal'}).getByRole('link', {name: 'OSM directions'}))
      .toHaveAttribute('href', 'https://www.openstreetmap.org/directions?to=52%2C4#map=16/52/4');
    await panel.getByRole('button', {name: 'Navigate', exact: true}).click();
    const initial = await panel.boundingBox();
    await panel.getByRole('button', {name: 'Expand', exact: true}).click();
    expect((await panel.boundingBox()).height).toBeGreaterThan(initial.height);
    await panel.locator('summary').filter({hasText: /^Advanced statistics$/}).click();
    const scroll = panel.locator('.iitc-iris-portal-scroll-body');
    await scroll.evaluate(element => {element.scrollTop = element.scrollHeight;});
    const position = await scroll.evaluate(element => element.scrollTop);
    expect(position).toBeGreaterThan(0);
    await panel.getByRole('button', {name: 'Close portal details', exact: true}).click();
    await expect(panel).toBeHidden();
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    await expect(panel).toHaveClass(/is-expanded/);
    expect(await scroll.evaluate(element => element.scrollTop)).toBe(position);
    await expect(panel.locator('details').filter({has: page.locator('summary', {hasText: /^Advanced statistics$/})})).toHaveAttribute('open');
    await panel.getByRole('button', {name: 'Reduce', exact: true}).click();
    await scroll.evaluate(element => {element.scrollTop = 0;});
    await page.screenshot({path: `/private/tmp/iris-ui-portal-${width}.png`});
  });
}

test('map grouping supports keyboard return and visibility reset preserves decorations', async ({page}) => {
  await page.setViewportSize({width: 320, height: 780});
  await setupPortalMap(page);
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
  await primary.getByRole('button', {name: 'Map', exact: true}).click();
  const tabs = page.locator('.iitc-iris-sheet-tabbar-secondary');
  await expect(tabs.getByRole('button').nth(0)).toHaveText('Search');
  await expect(tabs.getByRole('button').nth(1)).toHaveText('Missions');
  await expect(tabs.getByRole('button').nth(2)).toHaveText('Regional scores');
  await page.setViewportSize({width: 780, height: 280});
  const analysis = tabs.getByRole('button', {name: 'Analysis', exact: true});
  await analysis.click();
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await expect(page.locator('.iitc-iris-shell')).toHaveClass(/iitc-iris-sheet-map(?:\s|$)/);
  await expect(page.getByRole('button', {name: 'Back to Map menu'})).toBeFocused();
  expect((await page.getByRole('group', {name: 'Analysis', exact: true}).boundingBox()).y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Escape');
  await expect(analysis).toBeFocused();
  await expect(analysis).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({width: 320, height: 780});
  await tabs.getByRole('button', {name: 'Layers', exact: true}).click();
  await expect(page.locator('aside:visible')).toHaveCount(1);
  const draw = tabs.getByRole('button', {name: 'Draw tools', exact: true});
  await draw.click();
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await expect(page.getByRole('group', {name: 'Draw tools', exact: true})).toBeVisible();
  await draw.click();
  await expect(page.getByRole('group', {name: 'Draw tools', exact: true})).toHaveCount(0);
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await openMapGroupFor(page, 'Counts');
  await page.getByRole('group', {name: 'Analysis', exact: true}).getByRole('button', {name: 'Counts', exact: true}).click();
  await tabs.getByRole('button', {name: 'Layers', exact: true}).click();
  await page.locator('.iitc-iris-layer-secondary > summary').filter({hasText: /^Detail overlays$/}).click();
  await page.getByRole('checkbox', {name: 'Level labels', exact: true}).check();
  await page.getByRole('checkbox', {name: 'Fields', exact: true}).uncheck();
  await page.getByRole('checkbox', {name: 'Resistance portals', exact: true}).uncheck();
  await page.getByRole('button', {name: 'Close Layers', exact: true}).click();
  const filters = page.getByRole('group', {name: 'Active map filters'});
  await expect(filters).toContainText('Fields, Resistance portals');
  await filters.getByRole('button', {name: 'Inspect filters'}).click();
  await page.getByRole('group', {name: 'Active map filters'}).getByRole('button', {name: 'Show all map data'}).click();
  await expect(page.getByRole('group', {name: 'Active map filters'})).toHaveCount(0);
  await expect(page.getByRole('checkbox', {name: 'Fields', exact: true})).toBeChecked();
  await expect(page.getByRole('checkbox', {name: 'Resistance portals', exact: true})).toBeChecked();
  await page.locator('.iitc-iris-layer-secondary > summary').filter({hasText: /^Detail overlays$/}).click();
  await expect(page.getByRole('checkbox', {name: 'Level labels', exact: true})).toBeChecked();
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('iitc-iris:layer-settings'));
    return {fields: stored.fields, resistance: stored.resistance, labels: stored.labels};
  })).toEqual({fields: true, resistance: true, labels: true});
  await page.reload();
  await page.locator('.iitc-iris-layer-secondary > summary').filter({hasText: /^Detail overlays$/}).click();
  await expect(page.getByRole('checkbox', {name: 'Fields', exact: true})).toBeChecked();
  await expect(page.getByRole('checkbox', {name: 'Level labels', exact: true})).toBeChecked();
});


test('menu edge indicators follow scrolling, resizing and shorter menus', async ({page}) => {
  await page.setViewportSize({width: 320, height: 780});
  await setupPortalMap(page);
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
  await primary.getByRole('button', {name: 'Map', exact: true}).click();
  const row = page.locator('.iitc-iris-sheet-tabbar-secondary');
  const start = page.locator('.iitc-iris-menu-scroll-hint.is-start');
  const end = page.locator('.iitc-iris-menu-scroll-hint.is-end');
  await expect(end).toBeVisible();
  await expect(start).toHaveCount(0);
  await expect(end).toHaveAttribute('aria-hidden', 'true');
  await expect(end).toHaveCSS('pointer-events', 'none');
  await page.screenshot({path: '/private/tmp/iris-ui-menu-edge.png'});
  await row.evaluate(element => {element.scrollLeft = 100;});
  await expect(start).toBeVisible();
  await expect(end).toBeVisible();
  await row.evaluate(element => {element.scrollLeft = element.scrollWidth;});
  await expect(start).toBeVisible();
  await expect(end).toHaveCount(0);
  await row.getByRole('button', {name: 'Controls', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Close Controls', exact: true})).toBeVisible();
  await page.setViewportSize({width: 1200, height: 780});
  await expect(end).toHaveCount(0);
  await expect(start).toBeVisible();
  await page.setViewportSize({width: 320, height: 780});
  await expect(end).toBeVisible();
  await primary.getByRole('button', {name: 'Agent', exact: true}).click();
  await expect(start).toHaveCount(0);
  await expect(end).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 780});
  await expect(start).toHaveCount(0);
  await expect(end).toHaveCount(0);
  await primary.getByRole('button', {name: 'Map', exact: true}).click();
  await expect(end).toBeVisible();
});

test('Android Back closes tool groups before selection; Escape works outside the menu', async ({page}) => {
  await setupPortalMap(page);
  await selectPortal(page, 'alpha');
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
  await primary.getByRole('button', {name: 'Map', exact: true}).click();
  const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary');
  const back = () => page.evaluate(() => !window.dispatchEvent(new Event('IITC_IRIS_HOST_BACK', {cancelable: true})));
  for (const name of ['Analysis', 'Draw tools']) {
    const map = primary.getByRole('button', {name: 'Map', exact: true});
    if (await map.getAttribute('aria-pressed') !== 'true') await map.click();
    await secondary.getByRole('button', {name, exact: true}).click();
    await expect(page.getByRole('group', {name, exact: true})).toBeVisible();
    expect(await back()).toBe(true);
    await expect(page.getByRole('group', {name, exact: true})).toHaveCount(0);
    expect(await page.evaluate(() => window.portalFixture.entity?.selectedPortal?.guid)).toBe('alpha');
  }
  await primary.getByRole('button', {name: 'Map', exact: true}).click();
  await secondary.getByRole('button', {name: 'Analysis', exact: true}).click();
  await page.getByRole('button', {name: 'Zoom in', exact: true}).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', {name: 'Analysis', exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => window.portalFixture.entity?.selectedPortal?.guid)).toBe('alpha');
  expect(await back()).toBe(true);
  await expect(primary.getByRole('button', {name: 'Selected', exact: true})).toBeDisabled();
  expect(await back()).toBe(false);
});
