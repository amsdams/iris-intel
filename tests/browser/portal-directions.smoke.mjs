import {test, expect} from '@playwright/test';

for (const android of [false, true]) {
  for (const theme of ['light', 'dark']) {
    test(`portal map links use the selected coordinates (${android ? 'Android host' : 'browser'}, ${theme})`, async ({page, context}) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
        ? route.continue() : route.fulfill({status: 200, body: ''}));
      await page.addInitScript(theme => localStorage.setItem('iitc-iris:ui-theme', theme), theme);
      await page.goto('/');
      await expect.poll(() => page.evaluate(() => Boolean(window.__iitcIrisMap))).toBe(true);
      await context.route('**/map-links-fixture.json', route => route.fulfill({json: {result: {map: {
        links: {gameEntities: [
          ['directions', 1000, ['p', 'N', 52370123, 4893123, 1, 100, 8, '', 'Portal destination', [], false, false, null, 1000]],
          ['next', 1000, ['p', 'R', -33868800, 151209300, 1, 100, 8, '', 'Next portal', [], false, false, null, 1000]],
        ]},
      }}}}));
      await page.evaluate(() => new Promise(resolve => {
        const settled = ({data}) => {
          if (data.type !== 'IITC_IRIS_ENTITY_STATUS' || data.status !== 'fixture Map links') return;
          window.removeEventListener('message', settled);
          resolve();
        };
        window.addEventListener('message', settled);
        window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
          mode: 'fixture', id: 'map-links', label: 'Map links', url: '/map-links-fixture.json',
        }}, '*');
      }));
      await page.evaluate(android => {
        if (android) document.querySelector('meta[name="iitc-iris-asset-base"]').content
          = 'https://intel.ingress.com/__iris_android__/';
        window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'directions',
          portalLat: 52.370123, portalLng: 4.893123, zoom: 16}, '*');
      }, android);
      const portalTab = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Portal', exact: true});
      await expect(portalTab).toBeEnabled();
      await portalTab.click();
      const panel = page.getByRole('complementary', {name: 'Selected portal details'});
      await expect(panel.locator('.iitc-iris-panel-state')).toHaveText('error');
      await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_ENTITY_STATUS', portalDetails: {
        status: 'ready', guid: 'directions', mods: [], resonators: [],
      }}, '*'));
      await expect(panel.locator('summary')).toHaveText(['Mods', 'Resonators', 'Facts', 'Map links', 'Portal activity']);
      await expect(panel.locator('details').filter({has: page.locator('summary', {hasText: /^Map links$/})})).not.toHaveAttribute('open');
      await panel.locator('summary').filter({hasText: /^Map links$/}).click();
      const google = panel.getByRole('link', {name: 'Google Maps', exact: true});
      await expect(google).toBeVisible();
      await expect(panel.getByRole('link', {name: 'Bing Maps', exact: true})).toHaveAttribute('href', 'https://www.bing.com/maps/?v=2&cp=52.370123~4.893123&lvl=16&sp=Point.52.370123_4.893123_Portal%20destination___');
      await expect(panel.getByRole('link', {name: 'OpenStreetMap', exact: true})).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=52.370123&mlon=4.893123&zoom=16');
      const osmDirections = panel.getByRole('link', {name: 'OSM directions', exact: true});
      await expect(osmDirections).toHaveAttribute('href', 'https://www.openstreetmap.org/directions?to=52.370123%2C4.893123#map=16/52.370123/4.893123');
      await expect(osmDirections).toHaveAttribute('target', android ? '_self' : '_blank');
      await expect(google).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=52.370123%2C4.893123');
      await expect(google).toHaveAttribute('target', android ? '_self' : '_blank');
      await page.setViewportSize({width: 320, height: 640});
      const linksLayout = await panel.locator('[aria-label="Portal map links"] a').evaluateAll(links =>
        links.map(link => ({text: link.textContent.trim(), fits: link.scrollWidth <= link.clientWidth})));
      expect(linksLayout).toEqual(linksLayout.map(link => ({...link, fits: true})));
      await page.setViewportSize({width: 412, height: 780});
      const other = panel.getByRole('link', {name: 'Other maps…', exact: true});
      if (android) {
        await expect(other).toBeVisible();
        await expect(other).toHaveAttribute('href', 'geo:52.370123,4.893123');
      } else {
        await expect(other).toHaveCount(0);
        const popupPromise = page.waitForEvent('popup');
        await google.click();
        const popup = await popupPromise;
        await expect(popup).toHaveURL('https://www.google.com/maps/search/?api=1&query=52.370123%2C4.893123');
        await popup.close();
        await expect(panel).toBeVisible();
        await expect(panel).toContainText('Portal destination');
        const osmPopupPromise = page.waitForEvent('popup');
        await osmDirections.click();
        const osmPopup = await osmPopupPromise;
        await expect(osmPopup).toHaveURL('https://www.openstreetmap.org/directions?to=52.370123%2C4.893123#map=16/52.370123/4.893123');
        await osmPopup.close();
        await expect(panel).toBeVisible();
      }
      await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL',
        portalGuid: 'next', portalLat: -33.8688, portalLng: 151.2093, zoom: 16}, '*'));
      await expect(panel).toContainText('Next portal');
      await panel.locator('summary').filter({hasText: /^Map links$/}).click();
      await expect(google).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.8688%2C151.2093');
      await expect(osmDirections).toHaveAttribute('href', 'https://www.openstreetmap.org/directions?to=-33.8688%2C151.2093#map=16/-33.8688/151.2093');
      expect(errors).toEqual([]);
    });
  }
}
