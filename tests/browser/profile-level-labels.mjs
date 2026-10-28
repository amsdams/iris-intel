// Run against tests/browser/server.mjs after building the app; see README.md.
// Local synthetic data only. Durations are observations, never pass/fail thresholds.
import {chromium, expect} from '@playwright/test';

const gestures = process.argv.includes('--gestures');
const modes = [['--key-counts', 'keyCount'], ['--ornaments', 'ornaments'], ['--artifacts', 'artifacts']]
  .filter(([flag]) => process.argv.includes(flag));
if (modes.length > 1) throw new Error('Choose one overlay to profile at a time');
const overlay = modes[0]?.[1] ?? 'labels';
const keyCounts = overlay === 'keyCount';
const imageOverlay = overlay === 'ornaments' || overlay === 'artifacts';
const layerKey = imageOverlay ? overlay : 'labels';
const sizes = overlay === 'labels' ? gestures ? [4000] : [1000, 4000] : [100, 1000, 4000];
const browser = await chromium.launch({channel: 'chrome'});
try {
  const page = await browser.newPage({viewport: gestures ? {width: 412, height: 780} : {width: 1280, height: 800},
    deviceScaleFactor: gestures ? 2 : 1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({body: ''}));
  await page.route('**/levels.json', route => route.fulfill({json: {result: {map: {}}}}));
  // A shared decoded PNG isolates marker/render costs from remote image/network availability.
  const markerPng = imageOverlay ? await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#ffb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(30, 30, 24, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL();
  }) : undefined;
  await page.addInitScript(({layerKey, markerPng}) => {
    window.levelProfile = {layerKey, markerPng};
    if (markerPng) {
      const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', {...src, set(value) {
        src.set.call(this, String(value).includes('/marker_images/') ? markerPng : value);
      }});
    }
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_LAYER_SETTINGS' && data.layerSettings) window.levelProfile.settings = data.layerSettings;
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.levelProfile.status = data;
      if (data.type === 'IITC_IRIS_INVENTORY_STATUS') window.levelProfile.inventory = data.inventory;
    });
  }, {layerKey, markerPng});
  await page.goto('http://127.0.0.1:6973/');
  await page.waitForFunction(() => window.levelProfile.settings && window.__iitcIrisLayers);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'levels', label: 'levels', url: '/levels.json',
  }}, '*'));
  await page.waitForFunction(() => window.levelProfile.status?.status === 'fixture levels');
  await page.evaluate(() => window.__iitcIrisMap.setView([52, 4], 16, {animate: false}));
  await page.waitForTimeout(500);

  const results = [];
  for (const count of sizes) {
    await page.evaluate(({count, overlay}) => {
      const state = window.levelProfile;
      const map = window.__iitcIrisMap;
      const center = map.project(map.getCenter());
      const side = Math.ceil(Math.sqrt(count));
      state.entities = {generation: 10000 + count, links: [], fields: [], portals: Array.from({length: count}, (_, i) => {
        const ll = map.unproject([center.x + (i % side - side / 2) * 20, center.y + (Math.floor(i / side) - side / 2) * 20]);
        return {guid: `profile-${i}`, team: 'R', level: i % 8 + 1, isPlaceholder: false,
          latE6: Math.round(ll.lat * 1e6), lngE6: Math.round(ll.lng * 1e6), health: 100,
          ornaments: overlay === 'ornaments' ? ['profile-decoration'] : undefined,
          artifacts: overlay === 'artifacts' ? [{type: 'profile', role: i % 2 ? 'target' : 'fragment', ids: ['fixture']}] : undefined};
      })};
      state.settings = {...state.settings, labels: false, ornaments: false, artifacts: false, keyCount: false};
      window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
      window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: state.entities}, '*');
    }, {count, overlay});
    await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.portals.length)).toBe(count);

    if (keyCounts) {
      await page.evaluate(() => {
        const state = window.levelProfile;
        state.inventory = undefined;
        if (!state.originalFetch) state.originalFetch = window.fetch;
        window.fetch = (url, init) => {
          if (String(url).endsWith('/getHasActiveSubscription')) return Promise.resolve(Response.json({result: true}));
          if (String(url).endsWith('/getInventory')) return Promise.resolve(Response.json({result: state.entities.portals.map(p => [
            `key-${p.guid}`, 1, {resource: {resourceType: 'PORTAL_LINK_KEY'}, portalCoupler: {portalGuid: p.guid, portalTitle: 'Fixture'}},
          ])}));
          return state.originalFetch(url, init);
        };
        window.postMessage({type: 'IITC_IRIS_REQUEST_INVENTORY'}, '*');
      });
      await expect.poll(() => page.evaluate(() => window.levelProfile.inventory?.status), {timeout: 15000}).toBe('ready');
    }
    const samples = [];
    for (let repeat = 0; repeat < (gestures ? 0 : 4); repeat++) {
      const result = await page.evaluate(async overlay => {
        const state = window.levelProfile;
        state.settings = {...state.settings, [overlay]: true};
        const started = performance.now();
        window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings, sentAt: started}, '*');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Overlay toggle did not finish')), 5000);
          const poll = () => {
            if (state.status?.timing?.layerUpdate?.changedKeys?.includes(overlay) && window.__iitcIrisLayers[window.levelProfile.layerKey].length) {
              clearTimeout(timeout);
              resolve();
            } else {
              requestAnimationFrame(poll);
            }
          };
          requestAnimationFrame(poll);
        });
        const overlayLayers = () => window.__iitcIrisLayers[state.layerKey];
        const decodedImage = layer => layer.options.renderer?.images?.get(layer.options.portalImage?.url)?.image ?? layer.getElement();
        if (state.markerPng) await Promise.all(overlayLayers().map(layer => decodedImage(layer).decode()));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const toggleFrames = performance.now() - started;
        const timing = {...state.status.timing.layerUpdate};
        const labels = window.__iitcIrisLayers[window.levelProfile.layerKey].slice();

        const refreshStarted = performance.now();
        state.entities = {...state.entities, generation: state.entities.generation + 1};
        window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: state.entities}, '*');
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (state.markerPng) await Promise.all(overlayLayers().map(layer => decodedImage(layer).decode()));
        const refreshFrames = performance.now() - refreshStarted;
        const previousLabels = new Set(labels);
        const retained = window.__iitcIrisLayers[window.levelProfile.layerKey].filter(label => previousLabels.has(label)).length;
        state.settings = {...state.settings, [overlay]: false};
        window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
        return {toggleFrames, refreshFrames, timing, labels: labels.length, retained};
      }, overlay);
      await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers[window.levelProfile.layerKey].length)).toBe(0);
      if (repeat > 0) samples.push(result);
    }
    if (gestures) {
      results.push({count, gestures: await profileGestures(page, overlay, count)});
    } else {
      results.push({count, samples});
    }
  }
  const measurements = {overlay, results};
  expect(errors).toEqual([]);
  console.log(JSON.stringify(measurements, null, 2));
} finally {
  await browser.close();
}

// Hold the simulated dataset across camera-triggered refreshes; never measure an emptied map.
async function profileGestures(page, overlay, count) {
  await page.evaluate(() => {
    const state = window.levelProfile;
    state.gestureCenter = window.__iitcIrisMap.getCenter();
    if (!state.gestureFetch) state.gestureFetch = window.fetch;
    window.fetch = (url, init) => String(url).includes('levels.json')
      ? Promise.resolve(Response.json({result: {map: {fixture: {gameEntities: state.entities.portals.map(p => [p.guid, 1000,
        ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', p.ornaments ?? [], false, false,
          p.artifacts ? [p.artifacts.filter(a => a.role === 'fragment').map(a => [a.type, a.ids]),
            p.artifacts.filter(a => a.role === 'target').map(a => [a.type, a.ids])] : null, 1000],
      ])}}}})) : state.gestureFetch(url, init);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const rows = [];
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  for (const mode of ['off', 'on']) {
    await page.evaluate(({mode, overlay}) => {
      const state = window.levelProfile;
      window.__iitcIrisMap.setView(state.gestureCenter, 16, {animate: false});
      state.settings = {...state.settings, [overlay]: mode === 'on'};
      window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: state.settings}, '*');
    }, {mode, overlay});
    await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers[window.levelProfile.layerKey].length), {timeout: 15000}).toBe(mode === 'off' ? 0 : count);
    await page.waitForTimeout(500);
    const measures = [];
    for (const [step, action] of ['pan', 'zoom', 'pan', 'zoom'].entries()) {
      const before = await metrics();
      const sampled = await page.evaluate(({action, step}) => new Promise((resolve, reject) => {
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
          resolve({frames, labels: window.__iitcIrisLayers[window.levelProfile.layerKey].length,
            portals: window.__iitcIrisLayers.portals.length,
            inViewport: window.__iitcIrisLayers[window.levelProfile.layerKey].filter(layer => map.getBounds().contains(layer.getLatLng())).length,
            nodes: document.querySelectorAll('.iitc-iris-level-label, .iitc-iris-key-count-label, .iitc-iris-ornament-icon, .iitc-iris-artifact-icon').length,
            decodedImages: window.__iitcIrisLayers[window.levelProfile.layerKey].filter(layer => {
              const image = layer.options.renderer?.images?.get(layer.options.portalImage?.url)?.image ?? layer.getElement?.();
              return image?.complete && image.naturalWidth > 0;
            }).length,
            canvases: document.querySelectorAll('.iitc-iris-level-labels-canvas, .iitc-iris-key-counts-canvas, .iitc-iris-ornaments-canvas, .iitc-iris-artifacts-canvas').length});
        })));
        if (action === 'pan') map.panBy(step === 0 ? [120, 80] : [-120, -80], {animate: true, duration: 0.35});
        else map.setZoom(map.getZoom() === 16 ? 17 : 16, {animate: true});
      }), {action, step});
      expect(sampled.labels).toBe(mode === 'off' ? 0 : count);
      expect(sampled.portals).toBe(count);
      if (mode === 'on') expect(sampled.inViewport).toBeGreaterThan(0);
      if (mode === 'on' && overlay !== 'labels' && overlay !== 'keyCount') expect(sampled.decodedImages).toBe(count);
      const after = await metrics();
      measures.push({action, ...sampled, styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
        layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, taskMs: (after.TaskDuration - before.TaskDuration) * 1000});
      await page.waitForTimeout(500);
    }
    rows.push({mode, measures});
  }
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
  await cdp.detach();
  return rows;
}
