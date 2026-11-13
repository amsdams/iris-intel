import {expect, setFixtureSource} from './smoke-fixtures.mjs';

/** Portal responses are installed before navigation and restored automatically on reload. */
export async function installPortalFixture({page, context}) {
  await page.addInitScript(() => {
    window.portalFixture = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.portalFixture.entity = data;
    });
  });
  await context.route('**/portal-feature-map.json', route => route.fulfill({json: {result: {map: {core: {gameEntities: [
    ['alpha', 1, ['p', 'R', 52000000, 4000000, 1, 100, 8, '', 'Alpha', [], false, false, null, 1]],
    ['beta', 1, ['p', 'E', 52001000, 4001000, 1, 100, 7, '', 'Beta', [], false, false, null, 1]],
  ]}}}}}));
}

export async function setupPortalMap(page, theme = 'dark') {
  await page.addInitScript(theme => {
    localStorage.setItem('iitc-iris:ui-theme', theme);
    window.__irisRpcHandlers = {
      getArtifactPortals: () => Response.json({result: {}}),
      getPortalDetails: init => {
        const beta = JSON.parse(init.body).guid === 'beta';
        return Promise.resolve(Response.json({result: ['p', beta ? 'E' : 'R', beta ? 52001000 : 52000000,
          beta ? 4001000 : 4000000, 1, 50, beta ? 7 : 8, '', beta ? 'Beta' : 'Alpha', [], false, false, null, 1,
          [['Tester', 'LINK_AMPLIFIER', 'RARE', {LINK_RANGE_MULTIPLIER: '2000'}],
            ['Tester', 'HEATSINK', 'RARE', {HACK_SPEED: '500000'}]],
          Array.from({length: beta ? 7 : 8}, () => ['Other', 1, 500]), 'Other', null, 0]}));
      },
    };
  }, theme);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__iitcIrisMap))).toBe(true);
  await page.evaluate(() => Object.assign(window.PLAYER, {nickname: 'Tester', team: 'RESISTANCE', verified_level: 8}));
  await setFixtureSource(page, {id: 'portal', label: 'portal features', url: '/portal-feature-map.json'});
}

export async function selectPortal(page, guid) {
  await page.evaluate(guid => window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: guid}, '*'), guid);
  await expect.poll(() => page.evaluate(() => window.portalFixture.entity?.portalDetails?.guid)).toBe(guid);
  await expect.poll(() => page.evaluate(() => window.portalFixture.entity?.portalDetails?.status)).toBe('ready');
}
