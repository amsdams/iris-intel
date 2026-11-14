import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

test.beforeEach(installPortalFixture);

for (const {width, theme} of [{width: 320, theme: 'dark'}, {width: 412, theme: 'light'}, {width: 1200, theme: 'dark'}]) {
  test(`panel metadata lives in Diagnostics without new requests (${theme}, ${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 780});
    await setupPortalMap(page, theme);
    await selectPortal(page, 'alpha');
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    const portal = page.getByRole('complementary', {name: 'Selected portal details'});
    await expect(portal.getByText('Technical details', {exact: true})).toHaveCount(0);
    await expect(portal.locator('.iitc-iris-panel-footer')).toHaveCount(0);
    await primary.getByRole('button', {name: 'COMM', exact: true}).click();
    const comm = page.getByRole('complementary', {name: 'COMM messages panel'});
    await expect(comm).toContainText('No COMM messages for this channel and map bounds.');
    await expect(comm.getByRole('button', {name: 'Refresh', exact: true})).toBeEnabled();
    await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_COMM_STATUS', comm: {
      status: 'error', tab: 'all', messages: 1, error: 'Request failed; try Refresh.', elapsedMs: 700,
      recent: [{id: 'kept', time: Date.now(), text: 'Previously loaded chat', team: 'R', type: 'chat',
        parts: [{type: 'text', text: 'Previously loaded chat'}], portals: [], players: []}],
    }}, '*'));
    await expect(comm.getByRole('alert')).toHaveText('Request failed; try Refresh.');
    await expect(comm).toContainText('Previously loaded chat');
    await expect(comm.getByLabel('COMM summary')).toHaveText('1 loaded messages');
    await expect(comm.getByText('Technical details', {exact: true})).toHaveCount(0);
    await expect(comm.locator('.iitc-iris-panel-footer')).toHaveCount(0);

    await page.evaluate(() => {
      window.panelDiagnosticRequests = [];
      const original = window.fetch;
      window.fetch = (url, init) => {
        if (String(url).includes('/r/')) window.panelDiagnosticRequests.push(String(url));
        return original(url, init);
      };
    });
    await primary.getByRole('button', {name: 'System', exact: true}).click();
    await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Diagnostics', exact: true}).click();
    const system = page.getByRole('complementary', {name: 'System controls'});
    await page.evaluate(() => {
      const publish = (type, key, value) => window.postMessage({type, [key]: value}, '*');
      publish('IITC_IRIS_SCORES_STATUS', 'scores', {status: 'ready', requestState: 'ready', elapsedMs: 900,
        region: {status: 'ready', name: 'Cell', center: {latE6: 52000000, lngE6: 4000000}}});
      publish('IITC_IRIS_MISSIONS_STATUS', 'missions', {status: 'ready', requestState: 'ready', missions: [],
        source: 'portal', portalGuid: 'alpha', cached: true, elapsedMs: 1000, detailsStatus: 'ready',
        detailsCached: false, detailsElapsedMs: 200});
      publish('IITC_IRIS_AGENT_STATUS', 'agent', {status: 'ready', nickname: 'Tester', team: 'R',
        subscription: {status: 'active', elapsedMs: 300}});
      publish('IITC_IRIS_INVENTORY_STATUS', 'inventory', {status: 'ready', requestState: 'ready', items: 5,
        rawItems: 2, keys: 5, portalsWithKeys: 1, capsules: 0, portalKeysForSelectedPortal: null,
        selectedPortalGuid: 'alpha', elapsedMs: 600, subscription: {status: 'active', elapsedMs: 300}});
      publish('IITC_IRIS_SEARCH_STATUS', 'search', {status: 'ready', term: '', confirmed: true, results: [],
        localResults: 2, onlineResults: 3, elapsedMs: 400});
      publish('IITC_IRIS_PASSCODE_STATUS', 'passcode', {status: 'ready', requestState: 'ready', elapsedMs: 500,
        passcode: 'entered-code', ap: 100});
    });
    const details = system.locator('.iitc-iris-panel-diagnostics');
    await details.locator(':scope > summary').click();
    await expect(details.locator('.iitc-iris-panel-diagnostics-groups > details > summary'))
      .toHaveText(['Portal', 'COMM', 'Scores', 'Missions', 'Inventory', 'Profile', 'Search', 'Passcode']);
    const expected = {
      Portal: ['/r/getPortalDetails', 'alpha', 'ready'], COMM: ['/r/getPlexts (all)', 'empty', 'Response messages'],
      Scores: ['/r/getRegionScoreDetails', '52000000,4000000', '0.9s'],
      Missions: ['/r/getTopMissionsForPortal', '/r/getMissionDetails', '0.2s'],
      Inventory: ['/r/getInventory', 'C.O.R.E. active', '0.6s'],
      Profile: ['window.PLAYER inline Intel data', 'C.O.R.E. active', '0.3s'],
      Search: ['Nominatim search', '0.4s'], Passcode: ['/r/redeemReward', '0.5s'],
    };
    for (const [name, values] of Object.entries(expected)) {
      const group = details.locator(`details[aria-label="${name} diagnostics"]`);
      await group.locator(':scope > summary').click();
      await expect(group.locator('dl')).toBeVisible();
      for (const value of values) await expect(group).toContainText(value);
      expect(await group.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await group.locator(':scope > summary').click();
    }
    await expect(details).not.toContainText('entered-code');
    expect(await system.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => window.panelDiagnosticRequests)).toEqual([]);
    await system.getByRole('button', {name: 'Close diagnostics', exact: true}).click();
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    await expect(portal).toContainText('Alpha');
    await expect(portal.getByRole('button', {name: 'Share', exact: true})).toBeVisible();
  });
}
