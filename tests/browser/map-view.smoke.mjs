import {test, expect} from '@playwright/test';

test('URL view overrides stored view and movement persists through cookies, history and reload', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    if (!localStorage.getItem('view-fixture-seeded')) {
      localStorage.setItem('view-fixture-seeded', 'yes');
      localStorage.setItem('iitc-iris:map-view', JSON.stringify({lat: 30, lng: 20, zoom: 5}));
    }
    window.viewFixture = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_MAP_MOVED') window.viewFixture.moved = data;
      if (data.type === 'IITC_IRIS_PAGE_READY') window.viewFixture.ready = true;
    });
  });
  await page.goto('/?keep=yes&ll=52.1,4.2&z=15#view');
  await expect.poll(() => page.evaluate(() => window.viewFixture.ready)).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const map = window.__iitcIrisMap;
    return {lat: Number(map?.getCenter().lat.toFixed(3)), lng: Number(map?.getCenter().lng.toFixed(3)), zoom: map?.getZoom()};
  })).toEqual({lat: 52.1, lng: 4.2, zoom: 15});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_SET_VIEW', lat: 51.75, lng: 5.25, zoom: 14}, '*'));
  await expect.poll(() => page.evaluate(() => {
    const view = JSON.parse(localStorage.getItem('iitc-iris:map-view'));
    return {lat: Number(view.lat.toFixed(3)), lng: Number(view.lng.toFixed(3)), zoom: view.zoom};
  })).toEqual({lat: 51.75, lng: 5.25, zoom: 14});
  // Leaflet rounds its center to projected pixels during resize; serialization must match the actual moved view.
  const moved = await page.evaluate(() => JSON.parse(localStorage.getItem('iitc-iris:map-view')));
  expect(await page.evaluate(() => {
    const url = new URL(location.href);
    return {ll: url.searchParams.get('ll'), z: url.searchParams.get('z'), keep: url.searchParams.get('keep'), hash: url.hash};
  })).toEqual({ll: `${moved.lat.toFixed(6)},${moved.lng.toFixed(6)}`, z: '14', keep: 'yes', hash: '#view'});
  const cookies = await page.context().cookies();
  expect(Object.fromEntries(cookies.filter(cookie => cookie.name.startsWith('ingress.intelmap.'))
    .map(cookie => [cookie.name, cookie.value]))).toEqual({
    'ingress.intelmap.shflt': 'hdn', 'ingress.intelmap.lat': String(moved.lat), 'ingress.intelmap.lng': String(moved.lng), 'ingress.intelmap.zoom': '14',
  });
  // Drop only the position parameters to exercise the stored-view fallback on the next boot.
  await page.goto('/?keep=yes#view');
  await expect.poll(() => page.evaluate(() => window.viewFixture.ready)).toBe(true);
  expect(await page.evaluate(() => {
    const map = window.__iitcIrisMap;
    return {lat: Number(map.getCenter().lat.toFixed(3)), lng: Number(map.getCenter().lng.toFixed(3)), zoom: map.getZoom()};
  })).toEqual({lat: 51.75, lng: 5.25, zoom: 14});
  expect(errors).toEqual([]);
});
