import {test, expect, setFixtureSource} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';
import jsQR from 'jsqr';

test.use({locale: 'en-US', timezoneId: 'UTC'});

for (const android of [false, true]) {
  for (const theme of ['light', 'dark']) {
    test(`portal map links use the selected coordinates (${android ? 'Android host' : 'browser'}, ${theme})`, async ({page, context}) => {
      await page.addInitScript(theme => {
        localStorage.setItem('iitc-iris:ui-theme', theme);
        window.__irisRpcHandlers = {
          getArtifactPortals: () => Response.json({result: {}}),
          getPortalDetails: () => Response.json({result: false}),
        };
      }, theme);
      await page.goto('/');
      await expect.poll(() => page.evaluate(() => Boolean(window.__iitcIrisMap))).toBe(true);
      await context.route('**/map-links-fixture.json', route => route.fulfill({json: {result: {map: {
        links: {gameEntities: [
          ['directions', 1000, ['p', 'N', 52370123, 4893123, 1, 100, 8, '', 'Portal destination', [], false, false, null, 1000]],
          ['next', 1000, ['p', 'R', -33868800, 151209300, 1, 100, 8, '', 'Next portal', [], false, false, null, 1000]],
        ]},
      }}}}));
      await setFixtureSource(page, {id: 'map-links', label: 'Map links', url: '/map-links-fixture.json'});
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
      await expect(panel.locator('summary')).toHaveText(['Mods', 'Resonators', 'Advanced statistics', 'Facts', 'Map links', 'Portal activity']);
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
    });
  }
}

for (const theme of ['light', 'dark']) for (const width of [320, 1200]) {
  test(`Prime link copying and QR destinations follow portal selection (${theme}, ${width}px)`, async ({page, context}) => {
    await installPortalFixture({page, context});
    await page.setViewportSize({width, height: 780});
    await setupPortalMap(page, theme);
    await page.evaluate(() => {window.portalFixture.clipboard = [];
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
        writeText: async text => {window.portalFixture.clipboard.push(text);},
      }});
    });
    await selectPortal(page, 'alpha');
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    const portal = page.getByRole('complementary', {name: 'Selected portal details'});
    await portal.getByRole('button', {name: 'Share', exact: true}).click();
    await portal.getByRole('button', {name: 'Copy Prime link', exact: true}).click();
    await expect.poll(() => page.evaluate(() => window.portalFixture.clipboard)).toEqual(['https://link.ingress.com/portal/alpha']);
    await portal.getByRole('button', {name: 'Copy title', exact: true}).click();
    await expect(portal.getByRole('status')).toHaveText('portal title copied');
    await expect.poll(() => page.evaluate(() => window.portalFixture.clipboard)).toEqual(['https://link.ingress.com/portal/alpha', 'Alpha']);
    await portal.getByRole('button', {name: 'QR code', exact: true}).click();
    const qr = portal.getByRole('img', {name: 'Portal location QR code'});
    await expect(qr).toBeVisible();
    // Decode the actual rendered SVG, not the caption or encoder's internal matrix.
    const image = await qr.evaluate(async svg => {
      const copy = svg.cloneNode(true);
      copy.setAttribute('width', '256');
      copy.setAttribute('height', '256');
      const bitmap = new Image();
      bitmap.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
      await bitmap.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, 256, 256);
      return [...ctx.getImageData(0, 0, 256, 256).data];
    });
    expect(jsQR(Uint8ClampedArray.from(image), 256, 256)?.data).toBe('GEO:52,4');
    await expect(portal.locator('figcaption')).toHaveText('GEO:52,4');
    expect(await portal.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await selectPortal(page, 'beta');
    await expect(portal.getByRole('img', {name: 'Portal location QR code'})).toHaveCount(0);
    await portal.getByRole('button', {name: 'QR code', exact: true}).click();
    await expect(portal.locator('figcaption')).toHaveText('GEO:52.001,4.001');
  });
}
