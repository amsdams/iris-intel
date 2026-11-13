import {test, expect, setFixtureSource} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

test.use({locale: 'en-US', timezoneId: 'UTC'});
test.beforeEach(installPortalFixture);

test('portal access/link indicators clear with selection and survive map replacement without stale layers', async ({page}) => {
  await setupPortalMap(page);
  await selectPortal(page, 'alpha');
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.selectedPortal.length)).toBe(3);
  await page.evaluate(() => {
    window.portalFixture.oldRanges = [...window.__iitcIrisLayers.selectedPortal];
    window.portalFixture.oldMap = window.__iitcIrisMap;
    const old = document.getElementById('iitc-iris-map');
    const replacement = old.cloneNode(false);
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.portalFixture.oldMap !== window.__iitcIrisMap)).toBe(true);
  await setFixtureSource(page, {id: 'portal', label: 'portal features', url: '/portal-feature-map.json'});
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.selectedPortal.length)).toBe(3);
  expect(await page.evaluate(() => window.portalFixture.oldRanges.every(layer => !layer._map))).toBe(true);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_CLEAR_PORTAL_SELECTION'}, '*'));
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.selectedPortal.length)).toBe(0);
});
