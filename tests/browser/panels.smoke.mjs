import {test, expect} from '@playwright/test';
test.setTimeout(30_000);

async function openPanel(page, menu, name) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  if (!name) return page.locator('aside:visible');
  const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name, exact: true});
  if (await secondary.getAttribute('aria-pressed') !== 'true') await secondary.click();
  return page.locator('aside:visible');
}

async function reachable(locator) {
  // scrollIntoView can scroll overflow:hidden too, so first reject clipping ancestors.
  expect(await locator.evaluate(element => {
    const clipped = [];
    for (let parent = element.parentElement; parent && !parent.classList.contains('iitc-iris-shell'); parent = parent.parentElement) {
      if (parent.scrollHeight > parent.clientHeight + 2 && getComputedStyle(parent).overflowY === 'hidden') {
        clipped.push(parent.className);
      }
    }
    return clipped;
  })).toEqual([]);
  await locator.scrollIntoViewIfNeeded();
  await expect.poll(() => locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit !== null && element.contains(hit);
  })).toBe(true);
}

for (const viewport of [{width: 780, height: 360}, {width: 780, height: 280}, {width: 660, height: 280}, {width: 412, height: 780}]) {
  test(`panel contents remain reachable at ${viewport.width}×${viewport.height}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
      ? route.continue() : route.fulfill({status: 200, body: ''}));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');

    for (const [menu, name] of [
      ['Map', 'Missions'], ['Map', 'Links'], ['Map', 'Markers'], ['Agent', 'Profile'], ['Agent', 'Inventory'],
      ['Map', 'Display'], ['Map', 'Controls'], ['Map', 'Scores'], ['Map', 'Counts'], ['Map', 'List'],
      ['Map', 'Scoreboard'], ['Map', 'Search'], ['Agent', 'Passcode'], ['COMM', null],
      ['System', 'Appearance'], ['System', 'Diagnostics'], ['System', 'Shortcuts'],
    ]) {
      await test.step(name ?? menu, async () => {
        const panel = await openPanel(page, menu, name);
        await expect(panel).toBeVisible();
        if (name === 'Inventory' || name === 'Missions') {
          // The base fixture has no subscription; Inventory must stop before fetching items.
          await expect(panel.locator('.iitc-iris-panel-state')).toHaveText(name === 'Inventory' ? 'error' : 'empty');
        }
        // Supply representative data through the real UI message boundary, without Intel credentials.
        await page.evaluate(name => {
          if (name === 'Missions') window.postMessage({type: 'IITC_IRIS_MISSIONS_STATUS', missions: {
            status: 'ready', requestState: 'ready', source: 'view', caption: 'Landscape fixture',
            missions: Array.from({length: 24}, (_, i) => ({guid: `mission-${i}`, title: `Mission ${i}`, waypointCount: 6})),
          }}, '*');
          if (name === 'Inventory') window.postMessage({type: 'IITC_IRIS_INVENTORY_STATUS', inventory: {
            status: 'ready', requestState: 'ready', items: 24, keys: 24, portalsWithKeys: 24, capsules: 0,
            portalKeysForSelectedPortal: null,
            topKeys: Array.from({length: 24}, (_, i) => ({portalGuid: `portal-${i}`, portalTitle: `Key ${i}`, count: 1, capsule: 0})),
          }}, '*');
          if (name === 'Links' || name === 'Markers') window.postMessage({type: 'IITC_IRIS_DRAW_TOOLS_STATUS',
            drawToolsItems: Array.from({length: 24}, (_, i) => name === 'Links'
              ? {type: 'polyline', storageIndex: i, latLngs: [{lat: 52, lng: 4}, {lat: 52.01, lng: 4.01}]}
              : {type: 'marker', storageIndex: i, latLng: {lat: 52, lng: 4}, label: `Marker ${i}`, color: '#ff0000'}),
          }, '*');
        }, name);
        if (name === 'Missions') await reachable(panel.getByText('Mission 23', {exact: true}));
        if (name === 'Inventory') await reachable(panel.getByText('Key 23', {exact: true}));
        if (name === 'Links' || name === 'Markers') {
          await expect(panel.locator('.iitc-iris-draw-tools-list-item')).toHaveCount(24);
          await reachable(panel.locator('.iitc-iris-draw-tools-list-item').last());
          if (!await panel.locator('.iitc-iris-draw-tools-import-input').count()) {
            await panel.getByRole('button', {name: 'Import', exact: true}).click();
          }
          await reachable(panel.locator('.iitc-iris-draw-tools-import-input'));
        }
        const footer = panel.locator('.iitc-iris-panel-footer');
        if (await footer.count()) await reachable(footer);
        const bounds = await panel.boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        const menuBounds = await page.locator('.iitc-iris-sheet-tabbar').boundingBox();
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(menuBounds.y);
        if (name === 'Profile') await testInfo.attach('profile', {body: await page.screenshot(), contentType: 'image/png'});
        const close = panel.getByRole('button', {name: /^Close /});
        await expect(close).toHaveCount(1);
        await reachable(close);
        await close.click();
        await expect(page.locator('.iitc-iris-shell')).toHaveClass(/iitc-iris-sheet-map(?:\s|$)/);
        await expect(page.locator('aside:visible')).toHaveCount(0);
      });
    }
    expect(errors).toEqual([]);
  });
}
