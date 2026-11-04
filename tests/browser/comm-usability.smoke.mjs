import {test, expect} from '@playwright/test';
import {DEFAULT_LAYER_SETTINGS} from '../../apps/iitc-iris/src/map/layers/layer-registry.ts';

async function openComm(page) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'COMM', exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  return page.locator('aside[aria-label="COMM messages panel"]');
}

let errors;
test.beforeEach(async ({page}) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.goto('/');
  await expect(page.locator('.iitc-iris-sheet-tabbar')).toBeVisible();
  await page.evaluate(() => {
    const original = window.fetch;
    window.commReviewFixture = {calls: [], sendMode: 'fail', sendRequests: 0};
    const state = window.commReviewFixture;
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_COMM_STATUS') state.lastComm = data.comm;
    });
    const now = Date.now();
    const activity = (id, time, player, team, action, guid, name, latE6 = 52000000) => [id, time, {plext: {
      text: `${player} ${action} ${name}`, categories: 1, team, plextType: 'SYSTEM_BROADCAST', markup: [
        ['PLAYER', {plain: player, team}], ['TEXT', {plain: ` ${action} `}],
        ['PORTAL', {guid, name, latE6, lngE6: 4000000}],
      ],
    }}];
    state.rows = [
      activity('capture', now - 1000, 'AgentA', 'RESISTANCE', 'captured', 'p', 'Fountain'),
      activity('deploy', now - 2000, 'AgentB', 'ENLIGHTENED', 'deployed', 'other', 'Statue', 52001000),
      ['chat', now - 86_400_000, {plext: {text: 'SmokeTest says hello https://example.com/path.', categories: 1,
        team: 'RESISTANCE', plextType: 'PLAYER_GENERATED', markup: [
          ['SENDER', {plain: 'SmokeTest: ', team: 'RESISTANCE'}], ['TEXT', {plain: 'hello '}],
          ['AT_PLAYER', {plain: 'SmokeTest', team: 'RESISTANCE'}], ['TEXT', {plain: ' https://example.com/path.'}],
        ]}}],
    ];
    state.privateRows = [activity('private', now - 500, 'PrivateAgent', 'RESISTANCE', 'captured', 'p', 'Fountain')];
    window.fetch = async (url, init) => {
      const endpoint = String(url).split('/').pop();
      if (endpoint === 'getPlexts') {
        const payload = JSON.parse(init.body);
        state.calls.push(payload);
        if (state.malformed) return Response.json({unexpected: true});
        if (state.invalidTime !== undefined) {
          const row = structuredClone(state.rows[0]); row[0] = 'invalid'; row[1] = state.invalidTime;
          return Response.json({result: [row]});
        }
        const rows = (payload.tab === 'faction' ? state.privateRows : state.rows).filter(row => row[1] >= payload.minTimestampMs && (payload.maxTimestampMs < 0 || row[1] <= payload.maxTimestampMs));
        rows.sort((a, b) => payload.ascendingTimestampOrder ? a[1] - b[1] : b[1] - a[1]);
        return Response.json({result: rows});
      }
      if (endpoint === 'sendPlext') {
        state.sendRequests += 1;
        if (JSON.parse(init.body).v !== 'smoke-test') return Response.json({error: 'out of date'});
        if (Object.hasOwn(state, 'sendReply')) return Response.json(state.sendReply);
        if (state.sendMode === 'hold') return new Promise(resolve => {state.finishSend = value => resolve(Response.json(value));});
        return Response.json(state.sendMode === 'fail' ? {error: 'delivery failed'} : {result: true});
      }
      return original(url, init);
    };
  });
});

test.afterEach(() => {expect(errors).toEqual([]);});

test('retains failed drafts per channel, confirms a successful send, and preserves newer text after a late success', async ({page}) => {
  const panel = await openComm(page);
  const draft = panel.locator('.iitc-iris-comm-send-form input');
  await draft.fill('recover this');
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel).toContainText('Send failed');
  await expect(draft).toHaveValue('recover this');
  await panel.getByRole('tab', {name: 'Faction', exact: true}).click();
  await expect(draft).toHaveValue('');
  await draft.fill('faction draft');
  await panel.getByRole('tab', {name: 'All', exact: true}).click();
  await expect(draft).toHaveValue('recover this');
  await page.evaluate(() => {window.commReviewFixture.sendMode = 'hold';});
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(draft).toBeDisabled();
  // Mentioning a sender can replace the pending channel draft even while its input is disabled.
  await panel.getByTitle('Mention AgentA', {exact: true}).click();
  await page.evaluate(() => window.commReviewFixture.finishSend({result: true}));
  await expect(draft).toBeEnabled();
  await expect(draft).toHaveValue('recover this @AgentA ');
  await page.evaluate(() => {window.commReviewFixture.sendMode = 'success';});
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(draft).toHaveValue('');
  await panel.getByRole('tab', {name: 'Faction', exact: true}).click();
  await expect(draft).toHaveValue('faction draft');
});

test('dates, safe links, own mentions, clickable senders and nickname completion remain usable', async ({page}) => {
  const panel = await openComm(page);
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  await expect(panel.locator('.iitc-iris-comm-divider')).toHaveCount(2);
  const own = panel.locator('.iitc-iris-comm-row.is-own.is-mention');
  await expect(own).toContainText('@SmokeTest');
  await expect(own.locator('time')).toHaveAttribute('title', /.+/);
  await expect(own.getByRole('link')).toHaveAttribute('href', 'https://example.com/path');
  await expect(own.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  const draft = panel.locator('.iitc-iris-comm-send-form input');
  await panel.getByTitle('Mention AgentA', {exact: true}).click();
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue('@AgentA ');
  await draft.fill('hello Smoke');
  await draft.press('Tab');
  await expect(draft).toHaveValue('hello @SmokeTest ');
  await expect(draft).toBeFocused();
});

test('saved filters search loaded messages, persist across reload, and do not remove tracker activity', async ({page}, testInfo) => {
  const panel = await openComm(page);
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  await panel.locator('.iitc-iris-comm-filters > summary').click();
  await expect(panel.getByLabel('Search loaded COMM', {exact: true})).toBeVisible();
  await expect(panel.getByLabel('COMM action', {exact: true})).toBeHidden();
  const compactScreenshot = testInfo.outputPath('comm-compact.png');
  await page.screenshot({path: compactScreenshot});
  await testInfo.attach('comm-compact', {path: compactScreenshot, contentType: 'image/png'});
  await panel.locator('.iitc-iris-comm-filter-advanced > summary').click();
  await panel.getByLabel('COMM message kind', {exact: true}).selectOption('activity');
  await panel.getByLabel('COMM action', {exact: true}).selectOption('capture');
  await panel.getByLabel('COMM faction', {exact: true}).selectOption('R');
  await panel.getByLabel('Filter COMM agent', {exact: true}).fill('agenta');
  await panel.getByLabel('Filter COMM portal', {exact: true}).fill('fountain');
  await panel.getByLabel('Search loaded COMM', {exact: true}).fill('Fountain');
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(1);
  await page.evaluate(settings => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS',
    layerSettings: {...settings, playerTrackerResistance: true}}, '*'), DEFAULT_LAYER_SETTINGS);
  await expect(page.locator('.leaflet-marker-icon[title*="AgentA"]')).toHaveCount(1);
  await panel.getByLabel('Search loaded COMM', {exact: true}).fill('nothing matches');
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(0);
  await expect(page.locator('.leaflet-marker-icon[title*="AgentA"]')).toHaveCount(1);
  await panel.getByLabel('Search loaded COMM', {exact: true}).fill('Fountain');
  await panel.locator('.iitc-iris-comm-saved-views > summary').click();
  await panel.getByLabel('COMM view name', {exact: true}).fill('Captures');
  await panel.getByRole('button', {name: 'Save view', exact: true}).click();
  await expect(panel.getByRole('status')).toHaveText('Saved “Captures”.');
  await expect(panel.getByLabel('Saved COMM view', {exact: true})).toHaveValue('Captures');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iitc-iris:comm-views:v1')).saved.length)).toBe(1);
  await page.reload();
  await page.locator('.iitc-iris-comm-filters > summary').click();
  await expect(page.getByLabel('Search loaded COMM', {exact: true})).toHaveValue('Fountain');
  await page.getByRole('button', {name: 'Reset filters', exact: true}).click();
  await page.locator('.iitc-iris-comm-saved-views > summary').click();
  await page.getByLabel('Saved COMM view', {exact: true}).selectOption('Captures');
  await expect(page.getByLabel('COMM action', {exact: true})).toHaveValue('capture');
});

test('malformed refresh preserves loaded messages and portal timeline excludes unrelated portals and faction history', async ({page}, testInfo) => {
  let panel = await openComm(page);
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  await page.evaluate(() => {window.commReviewFixture.malformed = true;});
  await panel.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect(panel).toContainText('getPlexts returned malformed messages');
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  await page.evaluate(() => {window.commReviewFixture.malformed = false;});
  await panel.getByRole('tab', {name: 'Faction', exact: true}).click();
  await expect(panel).toContainText('PrivateAgent');
  await panel.getByRole('tab', {name: 'All', exact: true}).click();
  // The authoritative fixture must retain the selected portals if movement triggers another map fetch.
  await page.route('**/comm-review-map.json', route => route.fulfill({json: {result: {map: {'review-tile': {gameEntities: [
    ['p', 1000, ['p', 'R', 52000000, 4000000, 1, 100, 8, '', 'Fountain', [], false, false, null, 1000]],
    ['other', 1000, ['p', 'E', 52001000, 4000000, 1, 100, 8, '', 'Statue', [], false, false, null, 1000]],
  ]}}}}}));
  await page.evaluate(() => new Promise(resolve => {
    const settled = ({data}) => {
      if (data.type !== 'IITC_IRIS_ENTITY_STATUS' || data.status !== 'fixture COMM review') return;
      window.removeEventListener('message', settled);
      resolve();
    };
    window.addEventListener('message', settled);
    window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
      mode: 'fixture', id: 'comm-review', label: 'COMM review', url: '/comm-review-map.json',
    }}, '*');
  }));
  await page.evaluate(() => {
    window.commReviewFixture.malformed = false;
    window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'p', portalLat: 52, portalLng: 4, zoom: 16}, '*');
  });
  // Portal selection is separate from opening its panel.
  await expect(page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Portal', exact: true})).toBeEnabled();
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Portal', exact: true}).click();
  panel = page.locator('.iitc-iris-portal-side-panel');
  const timeline = page.locator('.iitc-iris-portal-activity');
  await timeline.locator('summary').first().click();
  await expect(timeline).toContainText('Loaded public COMM only');
  await expect(timeline).toContainText('1 of 1 loaded events');
  await expect(timeline).toContainText('AgentA');
  await expect(timeline).not.toContainText('AgentB');
  await expect(timeline).not.toContainText('SmokeTest');
  await expect(timeline).not.toContainText('PrivateAgent');
  await timeline.locator('ol summary').click();
  await expect(timeline).toContainText('AgentA captured Fountain');
  expect(await timeline.locator('ol').evaluate(element => getComputedStyle(element).overflowY)).toBe('visible');
  await timeline.locator('ol summary').focus();
  await page.keyboard.press('Enter');
  await expect(timeline.locator('.iitc-iris-portal-activity-event-body')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(timeline.locator('.iitc-iris-portal-activity-event-body')).toBeVisible();
  const timelineScreenshot = testInfo.outputPath('portal-activity.png');
  await page.screenshot({path: timelineScreenshot});
  await testInfo.attach('portal-activity', {path: timelineScreenshot, contentType: 'image/png'});
  const calls = await page.evaluate(() => window.commReviewFixture.calls.length);
  // New public data reaches an open timeline without opening or filtering COMM.
  await page.evaluate(() => {
    const row = structuredClone(window.commReviewFixture.rows[0]);
    row[0] = 'capture-new';
    row[1] = Date.now();
    window.commReviewFixture.rows.push(row);
    window.postMessage({type: 'IITC_IRIS_REQUEST_COMM', commTab: 'all'}, '*');
  });
  await expect(timeline).toContainText('2 of 2 loaded events');
  expect(await page.evaluate(() => window.commReviewFixture.calls.length)).toBe(calls + 1);
  // Changing selection replaces the subscription and discards the previous portal's view.
  await page.evaluate(() => {
    window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'other', portalLat: 52.001, portalLng: 4, zoom: 16}, '*');
  });
  await expect(timeline).toContainText('1 of 1 loaded events');
  await expect(timeline).toContainText('AgentB');
  await expect(timeline).not.toContainText('AgentA');
});


test('expanded filters stay reachable in light/dark phone and landscape layouts', async ({page}, testInfo) => {
  for (const theme of ['Light', 'Dark']) {
    await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'System', exact: true}).click();
    const appearance = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Appearance', exact: true});
    if (await appearance.getAttribute('aria-pressed') !== 'true') await appearance.click();
    await page.getByLabel('Appearance', {exact: true}).getByRole('button', {name: theme, exact: true}).click();
    const panel = await openComm(page);
    const filters = panel.locator('.iitc-iris-comm-filters');
    expect(await panel.getByLabel('Filter COMM agent', {exact: true}).evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgb(0, 0, 0)');
    if (!await filters.evaluate(element => element.open)) await filters.locator(':scope > summary').click();
    for (const selector of ['.iitc-iris-comm-filter-advanced', '.iitc-iris-comm-saved-views']) {
      const section = panel.locator(selector);
      if (!await section.evaluate(element => element.open)) await section.locator('summary').click();
    }
    for (const viewport of [{width: 412, height: 780}, {width: 780, height: 280}]) {
      await page.setViewportSize(viewport);
      for (const field of [panel.getByLabel('Search loaded COMM', {exact: true}), panel.getByLabel('COMM action', {exact: true}), panel.getByLabel('Saved COMM view', {exact: true}), panel.getByRole('button', {name: 'Reset filters', exact: true})]) {
        expect(await field.evaluate(element => {
          for (let parent = element.parentElement; parent && !parent.classList.contains('iitc-iris-shell'); parent = parent.parentElement) {
            if (parent.scrollHeight > parent.clientHeight + 2 && getComputedStyle(parent).overflowY === 'hidden') return parent.className;
          }
          return null;
        })).toBeNull();
        await field.scrollIntoViewIfNeeded();
        await expect.poll(() => field.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        })).toBe(true);
      }
      expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await testInfo.attach(`comm-filters-${theme}-${viewport.width}`, {body: await page.screenshot(), contentType: 'image/png'});
    }
  }
});


test('structured errors and ambiguous send replies preserve drafts without retrying; success tokens clear them', async ({page}) => {
  const panel = await openComm(page);
  const draft = panel.locator('.iitc-iris-comm-send-form input');
  const replies = [null, {result: false}, {error: {message: 'delivery denied'}}, {result: true, error: true}];
  for (const [index, reply] of replies.entries()) {
    await page.evaluate(reply => {window.commReviewFixture.sendReply = reply;}, reply);
    await draft.fill('keep this draft');
    await panel.getByRole('button', {name: 'Send', exact: true}).click();
    await expect.poll(() => page.evaluate(() => ({id: window.commReviewFixture.lastComm?.sendId,
      status: window.commReviewFixture.lastComm?.sendStatus}))).toEqual({id: index + 1, status: 'error'});
    await expect(draft).toHaveValue('keep this draft');
    expect(await page.evaluate(() => window.commReviewFixture.sendRequests)).toBe(index + 1);
  }
  await page.evaluate(() => {window.commReviewFixture.sendReply = {result: 'SUCCESS'};});
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(draft).toHaveValue('');
  expect(await page.evaluate(() => window.commReviewFixture.sendRequests)).toBe(5);
});

test('out-of-range timestamps preserve loaded history and cursor; presentation also tolerates invalid bridge data', async ({page}) => {
  const panel = await openComm(page);
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  const cursor = await page.evaluate(() => window.commReviewFixture.lastComm.newestTimestamp);
  await page.evaluate(() => {window.commReviewFixture.invalidTime = 8640000000000001;});
  await panel.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect(panel).toContainText('getPlexts returned malformed messages');
  await expect(panel.locator('.iitc-iris-comm-row')).toHaveCount(3);
  expect(await page.evaluate(() => window.commReviewFixture.lastComm.newestTimestamp)).toBe(cursor);
  await page.evaluate(() => {delete window.commReviewFixture.invalidTime;});
  await panel.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.commReviewFixture.lastComm.status)).toBe('ready');
  expect(await page.evaluate(() => window.commReviewFixture.calls.at(-1).minTimestampMs)).toBe(cursor);
  // A malformed internal bridge message must not throw in date presentation either.
  await page.evaluate(() => {
    const comm = window.commReviewFixture.lastComm;
    window.postMessage({type: 'IITC_IRIS_COMM_STATUS', comm: {...comm, oldestTimestamp: -1, recent: [
      {...comm.recent[0], id: 'bad-bridge-date', time: 8640000000000001},
    ]}}, '*');
  });
  await expect(panel).toContainText('Unknown date');
  await expect(panel.locator('.iitc-iris-comm-row time')).not.toHaveAttribute('datetime');
});

test('copy feedback preserves newer messages through old timers and late clipboard completion', async ({page}) => {
  await page.clock.install();
  await page.evaluate(() => {
    window.copyFixture = {};
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: text => {
      if (window.copyFixture.holdJson && text.startsWith('{')) return new Promise(resolve => {window.copyFixture.finish = resolve;});
      return Promise.resolve();
    }}});
  });
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'System', exact: true}).click();
  await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Diagnostics', exact: true}).click();
  const panel = page.locator('aside:visible');
  await panel.getByRole('button', {name: 'JSON', exact: true}).click();
  await expect(panel).toContainText('json copied');
  await page.clock.fastForward(1000);
  await panel.getByRole('button', {name: 'URL', exact: true}).click();
  await expect(panel).toContainText('url copied');
  await page.clock.fastForward(300);
  await expect(panel).toContainText('url copied');
  await page.clock.fastForward(1000);
  await expect(panel).not.toContainText('url copied');
  await page.evaluate(() => {window.copyFixture.holdJson = true;});
  await panel.getByRole('button', {name: 'JSON', exact: true}).click();
  await expect.poll(() => page.evaluate(() => Boolean(window.copyFixture.finish))).toBe(true);
  await panel.getByRole('button', {name: 'URL', exact: true}).click();
  await expect(panel).toContainText('url copied');
  await page.evaluate(() => window.copyFixture.finish());
  await expect(panel).toContainText('url copied');
  await expect(panel).not.toContainText('json copied');
});
