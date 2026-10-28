// Run against tests/browser/server.mjs after building the app; see README.md.
// Local synthetic data only. Durations are observations, never pass/fail thresholds.
import {chromium, expect} from '@playwright/test';

const gestures = process.argv.includes('--gestures');
const browser = await chromium.launch({channel: 'chrome'});
try {
  const page = await browser.newPage({viewport: gestures ? {width: 412, height: 780} : {width: 1280, height: 800},
    deviceScaleFactor: gestures ? 2 : 1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({body: ''}));
  await page.route('**/levels.json', route => route.fulfill({json: {result: {map: {}}}}));
  await page.addInitScript(() => {
    window.levelProfile = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_LAYER_SETTINGS' && data.layerSettings) window.levelProfile.settings = data.layerSettings;
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.levelProfile.status = data;
    });
  });
  await page.goto('http://127.0.0.1:6973/');
  await page.waitForFunction(() => window.levelProfile.settings && window.__iitcIrisLayers);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'levels', label: 'levels', url: '/levels.json',
  }}, '*'));
  await page.waitForFunction(() => window.levelProfile.status?.status === 'fixture levels');
  await page.evaluate(() => window.__iitcIrisMap.setView([52, 4], 16, {animate: false}));
  await page.waitForTimeout(500);

  const results = [];
  for (const count of gestures ? [4000] : [1000, 4000]) {
    await page.evaluate(count => {
      const state = window.levelProfile;
      const map = window.__iitcIrisMap;
      const center = map.project(map.getCenter());
      const side = Math.ceil(Math.sqrt(count));
      state.entities = {generation: 10000 + count, links: [], fields: [], portals: Array.from({length: count}, (_, i) => {
        const ll = map.unproject([center.x + (i % side - side / 2) * 20, center.y + (Math.floor(i / side) - side / 2) * 20]);
        return {guid: `profile-${i}`, team: 'R', level: i % 8 + 1, isPlaceholder: false,
          latE6: Math.round(ll.lat * 1e6), lngE6: Math.round(ll.lng * 1e6), health: 100};
      })};
      state.settings = {...state.settings, labels: false, ornaments: false, artifacts: false, keyCount: false};
      window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
      window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: state.entities}, '*');
    }, count);
    await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.portals.length)).toBe(count);

    const samples = [];
    for (let repeat = 0; repeat < (gestures ? 0 : 4); repeat++) {
      const result = await page.evaluate(async () => {
        const state = window.levelProfile;
        state.settings = {...state.settings, labels: true};
        const started = performance.now();
        window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings, sentAt: started}, '*');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Level-label toggle did not finish')), 5000);
          const poll = () => {
            if (state.status?.timing?.layerUpdate?.changedKeys?.includes('labels') && window.__iitcIrisLayers.labels.length) {
              clearTimeout(timeout);
              resolve();
            } else {
              requestAnimationFrame(poll);
            }
          };
          requestAnimationFrame(poll);
        });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const toggleFrames = performance.now() - started;
        const timing = {...state.status.timing.layerUpdate};
        const labels = window.__iitcIrisLayers.labels.slice();

        const refreshStarted = performance.now();
        state.entities = {...state.entities, generation: state.entities.generation + 1};
        window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: state.entities}, '*');
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const refreshFrames = performance.now() - refreshStarted;
        const previousLabels = new Set(labels);
        const retained = window.__iitcIrisLayers.labels.filter(label => previousLabels.has(label)).length;
        state.settings = {...state.settings, labels: false};
        window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
        return {toggleFrames, refreshFrames, timing, labels: labels.length, retained};
      });
      await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.labels.length)).toBe(0);
      if (repeat > 0) samples.push(result);
    }
    results.push({count, samples});
  }
  const measurements = gestures ? await profileGestures(page) : results;
  expect(errors).toEqual([]);
  console.log(JSON.stringify(measurements, null, 2));
} finally {
  await browser.close();
}

// Hold the simulated dataset across camera-triggered refreshes; never measure an emptied map.
async function profileGestures(page) {
  await page.evaluate(() => {
    const state = window.levelProfile;
    const response = {result: {map: {fixture: {gameEntities: state.entities.portals.map(p => [p.guid, 1000,
      ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', [], false, false, null, 1000],
    ])}}}};
    const original = window.fetch;
    window.fetch = (url, init) => String(url).includes('levels.json')
      ? Promise.resolve(Response.json(response)) : original(url, init);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const rows = [];
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  for (const mode of ['off', 'on']) {
    await page.evaluate(mode => {
      const state = window.levelProfile;
      state.settings = {...state.settings, labels: mode === 'on'};
      window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
    }, mode);
    await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.labels.length), {timeout: 15000}).toBe(mode === 'off' ? 0 : 4000);
    await page.waitForTimeout(500);
    const measures = [];
    for (const action of ['pan', 'zoom', 'pan', 'zoom']) {
      const before = await metrics();
      const sampled = await page.evaluate(action => new Promise((resolve, reject) => {
        const map = window.__iitcIrisMap;
        const frames = [];
        let finished = false;
        let last = performance.now();
        const timeout = setTimeout(() => { finished = true; reject(new Error('Gesture timeout')); }, 10000);
        const tick = now => {
          frames.push(now - last);
          last = now;
          if (!finished) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        map.once(action === 'pan' ? 'moveend' : 'zoomend', () => requestAnimationFrame(() => requestAnimationFrame(() => {
          finished = true;
          clearTimeout(timeout);
          resolve({frames, labels: window.__iitcIrisLayers.labels.length,
            nodes: document.querySelectorAll('.iitc-iris-level-label').length,
            canvases: document.querySelectorAll('.iitc-iris-level-labels-canvas').length});
        })));
        if (action === 'pan') map.panBy([120, 80], {animate: true, duration: 0.35});
        else map.setZoom(map.getZoom() === 16 ? 17 : 16, {animate: true});
      }), action);
      const after = await metrics();
      measures.push({action, ...sampled, styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
        layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, taskMs: (after.TaskDuration - before.TaskDuration) * 1000});
      await page.waitForTimeout(500);
    }
    rows.push({mode, measures});
  }
  return rows;
}
