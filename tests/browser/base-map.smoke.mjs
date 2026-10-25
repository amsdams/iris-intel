import {test, expect} from '@playwright/test';

async function appearance(page) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'System', exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Appearance', exact: true});
  if (await secondary.getAttribute('aria-pressed') !== 'true') await secondary.click();
  return page.getByLabel('Appearance', {exact: true});
}

test.beforeEach(async ({page}) => {
  // Empty valid vector styles and raster tiles make failure tests independent of providers.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:6973') return route.continue();
    if (url.hostname === 'tiles.openfreemap.org') return route.fulfill({
      json: {version: 8, sources: {}, layers: [{id: 'background', type: 'background', paint: {'background-color': '#345678'}}]},
    });
    return route.fulfill({status: 200, body: ''});
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Keep uncaught errors visible in the report, including those during failed GL initialization.
  await page.exposeFunction('getSmokeErrors', () => errors);
  await page.goto('/');
  await expect(page.locator('.iitc-iris-sheet-tabbar')).toBeVisible();
});
test.afterEach(async ({page}) => {
  expect(await page.evaluate(() => window.getSmokeErrors())).toEqual([]);
});

for (const failure of ['malformed style', 'HTTP failure']) {
  test(`${failure} switches once to OSM, synchronizes selection, and allows a manual retry`, async ({page}, testInfo) => {
    await page.route('https://tiles.openfreemap.org/styles/dark', route => route.fulfill(failure === 'malformed style'
      ? {json: {version: 0}} : {status: 503, contentType: 'application/json', body: '{}'}));
    const panel = await appearance(page);
    await panel.getByRole('button', {name: 'OpenFreeMap Dark', exact: true}).click();
    await expect(panel.getByRole('button', {name: 'OpenStreetMap', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.iitc-iris-base-layer-notice')).toContainText('Switched to OpenStreetMap');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('iitc-iris:base-layer'))).toBe('osm');
    await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'System', exact: true}).click();
    await expect(page.locator('.iitc-iris-base-layer-notice')).toBeVisible();
    await testInfo.attach('map-recovery-notice', {body: await page.screenshot(), contentType: 'image/png'});
    await appearance(page);
    await panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true}).click();
    await expect(page.locator('.leaflet-gl-layer canvas')).toBeVisible();
    await expect(page.locator('.iitc-iris-base-layer-notice')).toHaveCount(0);
    await expect(panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true})).toHaveAttribute('aria-pressed', 'true');
  });
}

test('unavailable WebGL cleans up the failed layer and keeps the map usable', async ({page}) => {
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  const panel = await appearance(page);
  await panel.getByRole('button', {name: 'OpenFreeMap Dark', exact: true}).click();
  await expect(panel.getByRole('button', {name: 'OpenStreetMap', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.leaflet-gl-layer')).toHaveCount(0);
  await page.evaluate(() => window.__iitcIrisMap.panBy([40, 0], {animate: false}));
  await expect(page.locator('.iitc-iris-sheet-tabbar')).toBeVisible();
});

test('a superseded style failure cannot replace the newer selection', async ({page}) => {
  let finishOldStyle;
  const pending = new Promise(resolve => { finishOldStyle = resolve; });
  await page.route('https://tiles.openfreemap.org/styles/dark', async route => {
    await pending;
    await route.fulfill({json: {version: 0}}).catch(() => {}); // Switching cancels the old request.
  });
  const panel = await appearance(page);
  await panel.getByRole('button', {name: 'OpenFreeMap Dark', exact: true}).click();
  await panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true}).click();
  finishOldStyle();
  await expect(page.locator('.leaflet-gl-layer canvas')).toBeVisible();
  await expect(panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.iitc-iris-base-layer-notice')).toHaveCount(0);
});

test('unrecoverable context loss switches to OSM after the recovery grace period', async ({page}) => {
  const panel = await appearance(page);
  await panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true}).click();
  const canvas = page.locator('.leaflet-gl-layer canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => {
    const gl = element.getContext('webgl2') ?? element.getContext('webgl');
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Browser cannot simulate WebGL loss');
    extension.loseContext();
  });
  await expect(panel.getByRole('button', {name: 'OpenStreetMap', exact: true}))
    .toHaveAttribute('aria-pressed', 'true', {timeout: 10_000});
  await expect(page.locator('.iitc-iris-base-layer-notice')).toContainText('renderer could not recover');
});

test('a restored WebGL context retains the selected vector map', async ({page}) => {
  const panel = await appearance(page);
  await panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true}).click();
  const canvas = page.locator('.leaflet-gl-layer canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => {
    const gl = element.getContext('webgl2') ?? element.getContext('webgl');
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Browser cannot simulate WebGL loss');
    element.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 100), {once: true});
    extension.loseContext();
  });
  // Cross the five-second fallback deadline to prove restoration cancelled it.
  await page.waitForTimeout(5500);
  await expect(panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.iitc-iris-base-layer-notice')).toHaveCount(0);
});

test('map replacement disposes the old vector layer and keeps the replacement usable', async ({page}) => {
  const panel = await appearance(page);
  await panel.getByRole('button', {name: 'OpenFreeMap Light', exact: true}).click();
  await expect(page.locator('.leaflet-gl-layer canvas')).toBeVisible();
  await page.evaluate(() => {
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = 'iitc-iris-map';
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect(page.locator('.leaflet-gl-layer canvas')).toHaveCount(1);
  await panel.getByRole('button', {name: 'OpenStreetMap', exact: true}).click();
  await expect(page.locator('.leaflet-gl-layer')).toHaveCount(0);
  await page.evaluate(() => window.__iitcIrisMap.panBy([40, 0], {animate: false}));
  await expect(page.locator('.iitc-iris-base-layer-notice')).toHaveCount(0);
});
