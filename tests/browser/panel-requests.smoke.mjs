import {test, expect} from '@playwright/test';

async function openPanel(page, menu, name) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name, exact: true});
  if (await secondary.getAttribute('aria-pressed') !== 'true') await secondary.click();
  return page.locator('aside:visible');
}

let errors;
test.beforeEach(async ({page}) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    window.panelFixture = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_SCORES_STATUS') window.panelFixture.scores = data.scores;
      if (data.type === 'IITC_IRIS_INVENTORY_STATUS') window.panelFixture.inventory = data.inventory;
      if (data.type === 'IITC_IRIS_PASSCODE_STATUS') window.panelFixture.passcode = data.passcode;
      if (data.type === 'IITC_IRIS_AGENT_STATUS') window.panelFixture.agent = data.agent;
    });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.panelFixture.agent?.subscription?.status)).toBe('inactive');
});
test.afterEach(async ({page}) => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});

test('Scores, Inventory/Profile and Passcode panels use their real request workflows', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.panelFixture.requests = [];
    window.fetch = (url, init) => {
      const endpoint = String(url).split('/').pop();
      const responses = {
        getGameScore: {result: ['300', '100']},
        getRegionScoreDetails: {result: {regionName: 'Fixture region', gameScore: ['30', '10'],
          scoreHistory: [['1', 1, 2]], topAgents: [{nick: 'FixtureAgent', team: 'RESISTANCE'}]}},
        getHasActiveSubscription: {result: true},
        getInventory: {result: [['key', 1, {resource: {resourceType: 'PORTAL_LINK_KEY'},
          portalCoupler: {portalGuid: 'fixture-portal', portalTitle: 'Fixture portal'}}]]},
        redeemReward: {rewards: {ap: '1000', xm: '2000', inventory: [{name: 'XMP Burster', awards: [{count: '3', level: '8'}]}]}},
      };
      if (!(endpoint in responses)) return original(url, init);
      window.panelFixture.requests.push({endpoint, payload: JSON.parse(init.body), csrf: init.headers['X-CSRFToken']});
      return Promise.resolve(Response.json(responses[endpoint]));
    };
  });
  let panel = await openPanel(page, 'Map', 'Scores');
  await expect(panel).toContainText('Fixture region');
  await expect(panel).toContainText('FixtureAgent');
  await expect(panel).toContainText('75%');
  panel = await openPanel(page, 'Agent', 'Inventory');
  await expect(panel.getByRole('button', {name: 'Fixture portal'})).toBeVisible();
  await expect(panel).toContainText('C.O.R.E. active');
  await page.evaluate(() => {
    window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: {generation: 900, links: [], fields: [], portals: [
      {guid: 'fixture-portal', title: 'Fixture portal', team: 'R', latE6: 52000000, lngE6: 4000000, isPlaceholder: false},
    ]}}, '*');
    window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'fixture-portal',
      portalLat: 52, portalLng: 4, zoom: 16}, '*');
  });
  await expect.poll(() => page.evaluate(() => window.panelFixture.inventory?.portalKeysForSelectedPortal?.total)).toBe(1);
  panel = await openPanel(page, 'Agent', 'Profile');
  await expect(panel).toContainText('C.O.R.E. active');
  panel = await openPanel(page, 'Agent', 'Passcode');
  await panel.getByPlaceholder('passcode', {exact: true}).fill(' test\u200bcode ');
  await panel.getByRole('button', {name: 'Redeem', exact: true}).click();
  await expect(panel).toContainText('XMP Burster L8');
  await expect(panel).toContainText('1,000');
  const requests = await page.evaluate(() => window.panelFixture.requests);
  const center = requests.find(request => request.endpoint === 'getRegionScoreDetails').payload;
  expect(center.latE6 / 1e6).toBeCloseTo(52, 4);
  expect(center.lngE6 / 1e6).toBeCloseTo(4, 4);
  expect(requests.find(request => request.endpoint === 'getInventory').payload.lastQueryTimestamp).toBe(0);
  expect(requests.find(request => request.endpoint === 'redeemReward').payload.passcode).toBe('testcode');
  expect(requests.every(request => request.csrf === 'smoke-test' && request.payload.v === 'smoke-test')).toBe(true);
});

test('closing Inventory cancels its response while the shared subscription still updates Profile', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.panelFixture.held = {};
    window.fetch = (url, init) => {
      const endpoint = String(url).split('/').pop();
      if (!['getHasActiveSubscription', 'getInventory'].includes(endpoint)) return original(url, init);
      return new Promise(resolve => {
        window.panelFixture.held[endpoint] = {signal: init.signal, finish: value => resolve(Response.json(value))};
      });
    };
  });
  await openPanel(page, 'Agent', 'Inventory');
  await expect.poll(() => page.evaluate(() => Object.keys(window.panelFixture.held).length)).toBe(2);
  await page.getByRole('button', {name: 'Close Inventory', exact: true}).click();
  await expect.poll(() => page.evaluate(() => ({inventory: window.panelFixture.held.getInventory.signal.aborted,
    subscription: window.panelFixture.held.getHasActiveSubscription.signal.aborted}))).toEqual({inventory: true, subscription: false});
  await page.evaluate(() => {
    window.panelFixture.held.getHasActiveSubscription.finish({result: true});
    window.panelFixture.held.getInventory.finish({result: []});
  });
  await expect.poll(() => page.evaluate(() => window.panelFixture.agent?.subscription?.status)).toBe('active');
  expect(await page.evaluate(() => window.panelFixture.inventory.status)).toBe('loading');
  const panel = await openPanel(page, 'Agent', 'Profile');
  await expect(panel).toContainText('C.O.R.E. active');
});

test('COMM channels, older history and sending use the shared authenticated runtime', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.panelFixture.commRequests = [];
    window.fetch = (url, init) => {
      const endpoint = String(url).split('/').pop();
      if (!['getPlexts', 'sendPlext'].includes(endpoint)) return original(url, init);
      const payload = JSON.parse(init.body);
      window.panelFixture.commRequests.push({endpoint, payload});
      if (endpoint === 'sendPlext') return Promise.resolve(Response.json({result: true}));
      const older = payload.maxTimestampMs > 0;
      return Promise.resolve(Response.json({result: [[`${payload.tab}-${older ? 'old' : 'new'}`, older ? 1000 : 2000,
        {plext: {text: `${payload.tab} ${older ? 'older' : 'current'} message`, categories: 1,
          team: 'RESISTANCE', plextType: 'PLAYER_GENERATED', markup: [
            ['SENDER', {plain: 'FixtureAgent: ', team: 'RESISTANCE'}],
            ['TEXT', {plain: `${payload.tab} ${older ? 'older' : 'current'} message`}],
          ]}}]]}));
    };
  });
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'COMM', exact: true}).click();
  const panel = page.locator('aside:visible');
  await expect(panel).toContainText('all current message');
  await panel.getByRole('button', {name: 'Older', exact: true}).click();
  await expect(panel).toContainText('all older message');
  await panel.getByRole('tab', {name: 'Faction', exact: true}).click();
  await expect(panel).toContainText('faction current message');
  await panel.getByPlaceholder('tell faction:').fill('fixture send');
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel.getByPlaceholder('tell faction:')).toBeEnabled();
  await expect(panel.getByPlaceholder('tell faction:')).toHaveValue('');
  await expect.poll(() => page.evaluate(() => window.panelFixture.commRequests.filter(r => r.endpoint === 'getPlexts' && r.payload.tab === 'faction').length)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => window.panelFixture.commRequests.filter(r => r.endpoint === 'sendPlext').length)).toBe(1);
  await panel.getByRole('tab', {name: 'Alerts', exact: true}).click();
  await expect(panel.getByPlaceholder("can't send to alerts")).toBeDisabled();
  await expect(panel).toContainText('alerts current message');
  const requests = await page.evaluate(() => window.panelFixture.commRequests);
  expect(requests.find(r => r.payload.maxTimestampMs > 0).payload).toMatchObject({tab: 'all', maxTimestampMs: 2000,
    plextContinuationGuid: 'all-new'});
  expect(requests.find(r => r.endpoint === 'sendPlext').payload).toMatchObject({tab: 'faction', message: 'fixture send'});
});
