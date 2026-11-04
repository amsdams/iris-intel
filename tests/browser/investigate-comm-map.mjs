// Diagnostic for the 2026-11-04 investigation; prints observations of current behavior.
// Build the app and start tests/browser/server.mjs before running this script.
import {chromium, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const registry = readFileSync(new URL('../../apps/iitc-iris/src/map/layers/layer-registry.ts', import.meta.url), 'utf8');
const defaultSettings = Object.fromEntries([...registry.matchAll(/\{id: '([^']+)'.*?defaultValue: (true|false)\}/g)]
  .map(match => [match[1], match[2] === 'true']));
assert.equal(defaultSettings.portals, true);
const browser = await chromium.launch({channel: 'chrome'});
try {
  const page = await browser.newPage({viewport: {width: 412, height: 780}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    // The cache captures Date.now before clock.install; keep its captured clock advanceable too.
    const nativeNow = Date.now;
    window.probeTimeOffset = 0;
    Date.now = () => nativeNow() + window.probeTimeOffset;
    window.probe = {entityRequests: [], commRequests: [], phase: 0};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_LAYER_SETTINGS') window.probe.settings = data.layerSettings;
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.probe.entityStatus = data;
      if (data.type === 'IITC_IRIS_COMM_STATUS') window.probe.commStatus = data.comm;
    });
  });
  await page.goto('http://127.0.0.1:6973/');
  await page.waitForFunction(() => window.__iitcIrisMap);
  await page.clock.install();
  await page.evaluate(defaultSettings => {
    const original = window.fetch;
    window.fetch = async (url, init) => {
      if (String(url).includes('/r/getArtifactPortals')) return Response.json({result: {}});
      if (String(url).includes('/r/getEntities')) {
        const payload = JSON.parse(init.body);
        window.probe.entityRequests.push({time: Date.now(), phase: window.probe.phase, payload});
        const faction = window.probe.phase ? 'R' : 'E';
        const oldGeometry = window.probe.phase ? [] : [
          ['old-link', Date.now(), ['e', 'E', 'capture-portal', 52000000, 4000000, 'anchor-b', 52001000, 4001000]],
          ['old-field', Date.now(), ['r', 'E', [['capture-portal', 52000000, 4000000], ['anchor-b', 52001000, 4001000], ['anchor-c', 52000000, 4002000]]]],
        ];
        return Response.json({result: {map: Object.fromEntries(payload.tileKeys.map(key => [key, {gameEntities: [
          ['capture-portal', Date.now(), ['p', faction, 52000000, 4000000, 1, 100, 1, '', 'Capture portal', [], false, false, null, Date.now()]],
          ...oldGeometry,
        ]}]))}});
      }
      if (String(url).includes('/r/getPlexts')) {
        const payload = JSON.parse(init.body);
        window.probe.commRequests.push({time: Date.now(), phase: window.probe.phase, payload});
        const latE6 = window.probe.phase === 2 ? 52050000 : window.probe.phase ? 52000000 : 51999000;
        window.probe.captureTimes ??= {};
        const time = window.probe.captureTimes[window.probe.phase] ??= Date.now();
        const name = window.probe.phase === 2 ? 'AreaAgent' : 'ProbeAgent';
        const row = [`activity-${window.probe.phase}`, time, {plext: {
          text: 'ProbeAgent captured Portal', categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST',
          markup: [['PLAYER', {plain: name, team: 'RESISTANCE'}], ['TEXT', {plain: ' captured '}],
            ['PORTAL', {name: 'Capture portal', latE6, lngE6: window.probe.phase === 2 ? 4050000 : 4000000}]],
        }}];
        return Response.json({result: payload.minTimestampMs > time ? [] : [row]});
      }
      return original(url, init);
    };
    window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {mode: 'live'}}, '*');
    window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: {...defaultSettings, playerTrackerResistance: true}}, '*');
    window.postMessage({type: 'IITC_IRIS_REQUEST_COMM', commTab: 'all'}, '*');
  }, defaultSettings);
  await page.clock.runFor(1500);
  await expect.poll(() => page.evaluate(() => window.probe.entityStatus?.status)).toBe('entities ready');
  const snapshot = label => page.evaluate(label => {
    const layers = window.__iitcIrisLayers;
    const portal = layers.entityLayerIndex.portals.get('capture-portal')?.[0];
    const players = Object.values(window.__iitcIrisMap._layers).filter(layer => /ProbeAgent|AreaAgent/.test(layer.options?.title ?? ''));
    return {label, time: Date.now(), entityRequests: window.probe.entityRequests.length, commRequests: window.probe.commRequests.length,
      portalColor: portal?.options.color, portalFill: portal?.options.fillColor,
      oldLinkPresent: layers.entityLayerIndex.links.has('old-link'), oldFieldPresent: layers.entityLayerIndex.fields.has('old-field'),
      commRows: window.probe.commStatus?.recent?.map(row => row.id),
      players: players.map(marker => ({title: marker.options.title, latLng: marker.getLatLng()})),
      mapStatus: window.probe.entityStatus?.status};
  }, label);
  const results = [await snapshot('initial')];
  assert.equal(results[0].portalColor, '#03dc03');
  assert.equal(results[0].oldLinkPresent, true);
  assert.equal(results[0].oldFieldPresent, true);
  await page.evaluate(() => {window.probe.phase = 1;});
  await page.evaluate(() => {window.probeTimeOffset += 120100;});
  await page.clock.fastForward(120100);
  await expect.poll(() => page.evaluate(() => window.probe.commRequests.length)).toBeGreaterThan(1);
  results.push(await snapshot('after COMM capture and periodic tracker refresh'));
  // On fixed builds, observe the authoritative timer before the page becomes idle.
  await page.evaluate(() => {window.probeTimeOffset += 300_000;});
  await page.clock.fastForward(300_000);
  results.push(await snapshot('stationary authoritative refresh before idle'));
  await page.evaluate(() => window.__iitcIrisMap.fire('moveend'));
  await page.clock.runFor(1500);
  results.push(await snapshot('movement while tile cache is still fresh'));
  await page.evaluate(() => {window.probeTimeOffset += 16 * 60 * 1000;});
  await page.clock.fastForward(16 * 60 * 1000);
  results.push(await snapshot('stationary for another 16 minutes'));
  await page.evaluate(() => window.__iitcIrisMap.fire('moveend'));
  await page.clock.runFor(1500);
  results.push(await snapshot('movement after cache expiry'));
  assert.equal(results.at(-1).portalColor, '#0088ff');
  assert.equal(results.at(-1).oldLinkPresent, false);
  assert.equal(results.at(-1).oldFieldPresent, false);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_REQUEST_COMM', commTab: 'all'}, '*'));
  await page.clock.runFor(100);
  results.push(await snapshot('explicit COMM refresh publishes buffered messages'));
  await page.evaluate(() => {
    window.probe.captureTimes[2] = window.probe.commRequests.at(-1).payload.minTimestampMs - 60000;
    window.probe.phase = 2;
    window.probe.newAreaRequestStart = window.probe.commRequests.length;
    document.dispatchEvent(new Event('keydown'));
    window.__iitcIrisMap.setView([52.05, 4.05], 16, {animate: false});
  });
  await page.clock.runFor(10_500);
  results.push({...await snapshot('new area with an event older than the old-area cursor'), ...await page.evaluate(() => ({
    firstNewAreaPayload: window.probe.commRequests[window.probe.newAreaRequestStart]?.payload, missingEventTime: window.probe.captureTimes[2],
  }))});
  console.log(JSON.stringify({results, errors}, null, 2));
} finally { await browser.close(); }
