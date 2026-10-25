import {test, expect} from '@playwright/test';

const results = page => page.locator('.iitc-iris-search-result:not(:disabled)');
const view = page => page.evaluate(() => {
  const map = window.__iitcIrisMap;
  const {lat, lng} = map.getCenter();
  return {lat, lng, zoom: map.getZoom()};
});
async function expectView(page, lat, lng, zoom = 15) {
  await expect.poll(async () => {
    const current = await view(page);
    return Math.abs(current.lat - lat) < 0.0001 && Math.abs(current.lng - lng) < 0.0001 && current.zoom === zoom;
  }, {message: `Navigate to ${lat},${lng} at zoom ${zoom}`}).toBe(true);
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:6973') return route.continue();
    if (url.hostname === 'nominatim.openstreetmap.org') return route.fulfill({json: [{
      place_id: 1, display_name: 'Test region', lat: '52.4', lon: '4.8',
      boundingbox: ['51', '54', '3', '7'],
    }]});
    return route.fulfill({status: 200, body: ''});
  });
  await page.goto('/');
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Map', exact: true}).click();
  await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Search', exact: true}).click();
});

test('Enter submits even with local results; arrows focus rows and activation navigates', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const input = page.locator('.iitc-iris-search-input');
  const initialView = await view(page);
  await input.fill('52.4,4.8');
  await expect(results(page)).toHaveCount(1);
  await input.press('Enter');
  await expect(results(page)).toHaveCount(2);
  await expect(input).toBeFocused();
  expect(await view(page)).toEqual(initialView);
  await expect(page.getByRole('button', {name: /^Zoom to /})).toHaveCount(0);

  // Visual grouping puts addresses before coordinates; navigation follows that order.
  await input.press('ArrowDown');
  await expect(results(page).nth(0)).toBeFocused();
  await results(page).nth(0).press('ArrowDown');
  await expect(results(page).nth(1)).toBeFocused();
  await results(page).nth(1).press('Enter');
  await expectView(page, 52.4, 4.8);

  // Area results fit their bounds, rather than using point-result zoom.
  await results(page).nth(0).click();
  await expect.poll(() => page.evaluate(() => {
    const map = window.__iitcIrisMap;
    return map.getZoom() < 11 && map.getBounds().contains([[51, 3], [54, 7]]);
  })).toBe(true);
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
  await results(page).nth(1).click();
  await expectView(page, 52.4, 4.8);

  // Shift no longer selects a different navigation action.
  await input.focus();
  await input.press('Shift+Enter');
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  await expect(results(page).last()).toBeFocused();
  await results(page).last().press('ArrowDown');
  await expect(results(page).first()).toBeFocused();
  expect(errors).toEqual([]);
});

test('loaded portal activation centers and applies the standard zoom', async ({page}) => {
  const input = page.locator('.iitc-iris-search-input');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: {
    generation: 1, portals: [{guid: 'search-test', title: 'Test portal', team: 'N',
      latE6: 52000000, lngE6: 4000000, isPlaceholder: false}], links: [], fields: [],
  }}, '*'));
  await input.fill('Test portal');
  await expect(results(page)).toHaveCount(1);
  await input.press('ArrowDown');
  await expect(results(page).first()).toBeFocused();
  // This portal is already visible; opening it still centers and applies the standard zoom.
  await results(page).first().press('Enter');
  await expectView(page, 52, 4);
  await expect(page.locator('.iitc-iris-search-panel')).toHaveCount(0);
});

test('slash opens or refocuses Search without changing menu or text-field behavior', async ({page}) => {
  const input = page.locator('.iitc-iris-search-input');
  // The beforeEach opens Search through its menu; it must not summon the keyboard.
  await expect(input).not.toBeFocused();
  await page.getByRole('button', {name: 'Close search', exact: true}).click();
  await expect(input).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(input).toBeFocused();
  await page.keyboard.type('52.4,4.8');
  await expect(input).toHaveValue('52.4,4.8');
  await expect(results(page)).toHaveCount(1);
  await input.press('ArrowDown');
  await expect(results(page).first()).toBeFocused();
  await page.keyboard.press('/');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('52.4,4.8');
  await input.press('End');
  await input.press('/');
  await expect(input).toHaveValue('52.4,4.8/');

  await page.getByRole('button', {name: 'Close search', exact: true}).click();
  await page.evaluate(() => localStorage.setItem('iitc-iris:shortcuts-enabled', 'false'));
  await page.reload();
  await expect(page.locator('.iitc-iris-sheet-tabbar')).toBeVisible();
  await page.keyboard.press('/');
  await expect(input).toHaveCount(0);
});

test('streets zoom in to 15 while larger administrative areas fit their bounds', async ({page}) => {
  const areas = [
    {name: 'Street', bounds: [52.369, 52.371, 4.89, 4.9]},
    {name: 'Municipality', bounds: [52.28, 52.43, 4.72, 5.02]},
    {name: 'Province', bounds: [52.1, 53.2, 4.4, 5.4]},
    {name: 'Country', bounds: [50.7, 53.6, 3.3, 7.3]},
    {name: 'Continent', bounds: [34, 71, -25, 45]},
  ];
  await page.route('https://nominatim.openstreetmap.org/**', route => {
    const area = areas.find(area => area.name === new URL(route.request().url()).searchParams.get('q'));
    const [south, north, west, east] = area.bounds;
    return route.fulfill({json: [{place_id: area.name, display_name: area.name,
      lat: String((south + north) / 2), lon: String((west + east) / 2), boundingbox: area.bounds.map(String),
    }]});
  });
  for (const area of areas) {
    await test.step(area.name, async () => {
      const input = page.locator('.iitc-iris-search-input');
      await input.fill(area.name);
      await input.press('Enter');
      const result = results(page).filter({hasText: area.name});
      await expect(result).toHaveCount(1);
      await result.click();
      await expect.poll(() => page.evaluate(bounds => {
        const [south, north, west, east] = bounds;
        return window.__iitcIrisMap.getBounds().contains([[south, west], [north, east]]);
      }, area.bounds)).toBe(true);
      await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
      if (area.name === 'Street') expect((await view(page)).zoom).toBe(15);
      else expect((await view(page)).zoom).toBeLessThan(15);
    });
  }
});


test('fast submission keeps online results; closing clears previews and reopening retains the search', async ({page}) => {
  await page.route('https://nominatim.openstreetmap.org/**', async route => {
    // Keep online work pending beyond the 100ms local debounce to expose stale local requests.
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({json: [{place_id: 1, display_name: 'Amsterdam test area',
      lat: '52.37', lon: '4.9', boundingbox: ['52.28', '52.43', '4.72', '5.02'],
    }]});
  });
  await page.evaluate(() => {
    window.__smokeSearchRequests = [];
    window.addEventListener('message', event => {
      if (event.data?.type === 'IITC_IRIS_SEARCH_REQUEST') window.__smokeSearchRequests.push(event.data);
    });
  });
  const input = page.locator('.iitc-iris-search-input');
  await input.fill('Amsterdam');
  await input.press('Enter');
  const result = results(page).filter({hasText: 'Amsterdam test area'});
  await expect(result).toHaveCount(1);
  const requests = await page.evaluate(() => window.__smokeSearchRequests);
  const confirmed = requests.findIndex(request => request.searchConfirmed);
  expect(confirmed).toBeGreaterThanOrEqual(0);
  expect(requests.slice(confirmed)).toEqual([expect.objectContaining({searchTerm: 'Amsterdam', searchConfirmed: true})]);

  await result.click();
  await expect.poll(() => page.evaluate(() => window.__iitcIrisMap.getBounds().contains([[52.28, 4.72], [52.43, 5.02]]))).toBe(true);
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.search.length)).toBeGreaterThan(0);
  const selectedView = await view(page);
  await page.getByRole('button', {name: 'Close search', exact: true}).click();
  await expect(input).toHaveCount(0);
  await expect(page.locator('.iitc-iris-map-search-badge')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.search.length)).toBe(0);
  expect(await view(page)).toEqual(selectedView);

  await page.keyboard.press('/');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Amsterdam');
  await expect(result).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.search.length)).toBeGreaterThan(0);
  expect(await view(page)).toEqual(selectedView);
});
