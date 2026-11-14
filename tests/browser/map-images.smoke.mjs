import {test, expect, entities, render, settings} from './entity-fixture.mjs';
import {waitForMapFrames} from './navigation-fixture.mjs';

const decoratedEntities = {
  ...entities, generation: 1100,
  portals: entities.portals.map((p, i) => ({...p, ornaments: ['fixture-ring'],
    artifacts: [{type: 'fixture', role: i === 0 ? 'target' : 'fragment', ids: [String(i)]}]})),
};
const decorationCounts = page => page.evaluate(() => ['ornaments', 'artifacts'].map(key => window.__iitcIrisLayers[key].length));
async function imageFixture(page) {
  const images = await page.evaluate(() => {
    window.entityFixture.images = [];
    // Keep fixtures same-origin so pixel assertions can inspect the canvas; real image display
    // deliberately keeps the old <img> permissions and does not depend on remote CORS headers.
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {...src, set(value) {
      const url = new URL(value, location.href);
      src.set.call(this, url.pathname.includes('/marker_images/') ? `${location.origin}${url.pathname}` : value);
    }});
    window.Image = new Proxy(window.Image, {construct(Target, args) {
      const image = Reflect.construct(Target, args);
      window.entityFixture.images.push(image);
      return image;
    }});
    return Object.fromEntries(['yellow', 'red', 'blue'].map(color => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 60;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 60, 60);
      return [color, canvas.toDataURL().split(',')[1]];
    }));
  });
  await page.route('**/marker_images/**', route => route.fulfill({contentType: 'image/png',
    body: Buffer.from(images[/shard_target|fixture-red/.test(route.request().url()) ? 'red'
      : /shard|fixture-blue/.test(route.request().url()) ? 'blue' : 'yellow'], 'base64')}));
  return images;
}
const imagePixel = (page, key, guid = 'res', dx = 0, dy = 0) => page.evaluate(({key, guid, dx, dy}) => {
  const canvas = document.querySelector(`.iitc-iris-${key}-canvas`);
  const layer = window.__iitcIrisLayers[key].find(l => JSON.parse(l.options.portalImage.guid)[0] === guid);
  if (!canvas || !layer) return [];
  const map = window.__iitcIrisMap;
  const point = map.latLngToContainerPoint(layer.getLatLng());
  const mapRect = map.getContainer().getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = Math.round((mapRect.left + point.x + dx - rect.left) * scale);
  const y = Math.round((mapRect.top + point.y + dy - rect.top) * scale);
  return [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];
}, {key, guid, dx, dy});
const emptyImageCanvases = page => page.evaluate(() => [...document.querySelectorAll(
  '.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')].every(canvas => {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  return !data.some((value, i) => i % 4 === 3 && value);
}));

test('image overlays retain unchanged decorations, update styles/positions and preserve exclusions and visibility', async ({page}) => {
  await imageFixture(page);
  await settings(page, {ornaments: true, artifacts: true});
  await render(page, decoratedEntities);
  await expect.poll(() => decorationCounts(page)).toEqual([3, 3]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await expect.poll(() => imagePixel(page, 'artifacts', 'enl')).toEqual([0, 0, 255, 153]);
  await expect(page.locator('.iitc-iris-ornament-icon,.iitc-iris-artifact-icon')).toHaveCount(0);
  await expect(page.locator('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')).toHaveCount(2);
  expect(await imagePixel(page, 'ornaments', 'res', 31)).toEqual([0, 0, 0, 0]);
  expect(await imagePixel(page, 'artifacts', 'res', 26)).toEqual([0, 0, 0, 0]);
  expect(await imagePixel(page, 'artifacts', 'enl', 16)).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => {
    window.entityFixture.decorations = Object.fromEntries(['ornaments', 'artifacts']
      .map(key => [key, window.__iitcIrisLayers[key].slice()]));
  });
  await render(page, {...decoratedEntities, generation: 1101,
    portals: decoratedEntities.portals.map(p => ({...p, health: 50, artifacts: p.artifacts.map(a => ({...a, ids: ['new']}))}))});
  await expect.poll(() => page.evaluate(() => ['ornaments', 'artifacts'].every(key =>
    window.__iitcIrisLayers[key].every((layer, i) => layer === window.entityFixture.decorations[key][i])))).toBe(true);
  expect(await page.evaluate(() => window.entityFixture.images.length)).toBe(3);
  // These image overlays deliberately use entity portals rather than the label faction filters.
  await settings(page, {resistance: false, level8Portals: false});
  await expect.poll(() => decorationCounts(page)).toEqual([3, 3]);
  await page.evaluate(() => localStorage.setItem('excludedOrnaments', JSON.stringify(['fixture-'])));
  await render(page, {...decoratedEntities, generation: 1102});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 3]);
  await page.evaluate(() => localStorage.removeItem('excludedOrnaments'));
  const changed = {...decoratedEntities, generation: 1103, portals: [
    {...decoratedEntities.portals[0], latE6: 52000200, level: 5,
      ornaments: ['fixture-new'], artifacts: [{type: 'fixture', role: 'fragment', ids: ['0']}]},
    decoratedEntities.portals[1],
  ]};
  await render(page, changed);
  await expect.poll(() => decorationCounts(page)).toEqual([2, 2]);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([0, 0, 255, 153]);
  expect(await page.evaluate(() => {
    const previous = window.entityFixture.decorations.artifacts;
    const layers = window.__iitcIrisLayers.artifacts;
    return [layers[0] === previous[1], layers[1] !== previous[0], layers[1].getLatLng().lat,
      window.__iitcIrisLayers.ornaments[0].options.portalImage.zIndexOffset];
  })).toEqual([true, true, 52.0002, 8]);
  await settings(page, {ornaments: false, artifacts: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await settings(page, {ornaments: true, artifacts: true});
  await expect.poll(() => decorationCounts(page)).toEqual([2, 2]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  const stacked = {...decoratedEntities, generation: 1104, portals: [{...decoratedEntities.portals[0], artifacts: [],
    ornaments: ['fixture-red', 'fixture-blue']}]};
  await render(page, stacked);
  await expect.poll(async () => {
    const pixel = await imagePixel(page, 'ornaments');
    return pixel[2] > pixel[0] && pixel[3] === 214;
  }).toBe(true);
  await page.evaluate(() => { window.entityFixture.topOrnament = window.__iitcIrisLayers.ornaments[1]; });
  await render(page, {...stacked, generation: 1105, portals: [{...stacked.portals[0], ornaments: ['fixture-new', 'fixture-blue']}]});
  await expect.poll(async () => {
    const pixel = await imagePixel(page, 'ornaments');
    return pixel[2] > pixel[0] && pixel[1] > 0 && pixel[3] === 214;
  }).toBe(true);
  expect(await page.evaluate(() => window.__iitcIrisLayers.ornaments.includes(window.entityFixture.topOrnament))).toBe(true);
  await render(page, {...stacked, generation: 1106, portals: [{...stacked.portals[0], isPlaceholder: true}]});
  await expect.poll(() => decorationCounts(page)).toEqual([2, 0]);
});

test('image overlays follow animated gestures, preserve stacking and recover after full clear and map replacement', async ({page}) => {
  await imageFixture(page);
  // Include two roles at the same portal: targets must stack above fragments, regardless of array order.
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], artifacts: [
    {type: 'fixture', role: 'target', ids: ['1']}, {type: 'fixture', role: 'fragment', ids: ['2']},
  ]}]};
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {fixture: {
    gameEntities: value.portals.map(p => [p.guid, 1000, ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', p.ornaments,
      false, false, [[['fixture', ['2']]], [['fixture', ['1']]]], 1000]]),
  }}}}}));
  await settings(page, {ornaments: true, artifacts: true});
  await render(page, value);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('moveend', resolve);
    map.panBy([40, 30], {animate: true, duration: 0.1});
  }));
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('zoomend', resolve);
    map.setZoom(17, {animate: true});
  }));
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await page.evaluate(() => window.__iitcIrisMap.setZoom(13, {animate: false}));
  // Image overlays remain enabled at low zoom; only ornament size changes.
  await expect.poll(() => decorationCounts(page)).toEqual([1, 2]);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.ornaments[0].options.portalImage.size)).toBe(48);
  await page.evaluate(() => window.__iitcIrisMap.setZoom(16, {animate: false}));
  await render(page, {...value, generation: 1104});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {}}}}));
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'image-clear', label: 'image-clear', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture image-clear');
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await render(page, {...value, generation: 1105});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => {
    window.entityFixture.oldImages = [...window.__iitcIrisLayers.ornaments, ...window.__iitcIrisLayers.artifacts];
    window.entityFixture.oldImageCanvases = [...document.querySelectorAll('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')];
    const map = window.__iitcIrisMap;
    map.eachLayer(layer => layer.redraw?.());
    map.panBy([5, 5], {animate: false});
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'image-replace', label: 'image-replace', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture image-replace');
  await render(page, {...value, generation: 1106});
  await settings(page, {ornaments: true, artifacts: true});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  expect(await page.evaluate(() => ({
    detached: window.entityFixture.oldImageCanvases.every(canvas => !canvas.isConnected),
    fresh: [...window.__iitcIrisLayers.ornaments, ...window.__iitcIrisLayers.artifacts]
      .every(layer => !window.entityFixture.oldImages.includes(layer)),
    passive: [...document.querySelectorAll('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')]
      .every(canvas => getComputedStyle(canvas).pointerEvents === 'none'),
  }))).toEqual({detached: true, fresh: true, passive: true});
});

test('late or failed image loads do not revive removed overlays and toggling retries failures', async ({page}) => {
  const images = await imageFixture(page);
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let started = 0;
  await page.route('**/marker_images/slow.png', async route => {
    started++;
    await pending;
    await route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  let failures = 0;
  await page.route('**/marker_images/broken.png', route => {
    failures++;
    return failures === 1 ? route.fulfill({status: 404, body: ''})
      : route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  await settings(page, {ornaments: true, artifacts: true});
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], ornaments: ['slow', 'broken']}]};
  await render(page, value);
  await expect.poll(() => started).toBe(1);
  await expect.poll(() => failures).toBe(1);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await settings(page, {ornaments: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 1]);
  expect(await page.evaluate(() => window.entityFixture.images.filter(image => image.src.endsWith('/slow.png'))
    .every(image => image.onload === null && image.onerror === null))).toBe(true);
  finish();
  await expect.poll(() => emptyImageCanvases(page)).toBe(false); // artifact is unaffected
  await settings(page, {artifacts: false});
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await settings(page, {ornaments: true});
  await expect.poll(() => failures).toBe(2);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 214]); // two 60% images
});

test('image cache bounds unused URLs and detaches pending loads when the map is replaced', async ({page}) => {
  const images = await imageFixture(page);
  await settings(page, {ornaments: true});
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], artifacts: [],
    ornaments: Array.from({length: 132}, (_, i) => `cache-${i}`)}]};
  await render(page, value);
  await expect.poll(() => page.evaluate(() => window.entityFixture.images.filter(image => image.complete && image.naturalWidth).length)).toBe(132);
  await settings(page, {ornaments: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  expect(await page.evaluate(() => window.entityFixture.images.filter(image => image.onload !== null).length)).toBe(128);
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let started = false;
  await page.route('**/marker_images/map-pending.png', async route => {
    started = true;
    await pending;
    await route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  await render(page, {...value, generation: 1107, portals: [{...value.portals[0], ornaments: ['map-pending']}]});
  await settings(page, {ornaments: true});
  await expect.poll(() => started).toBe(true);
  await waitForMapFrames(page);
  await page.evaluate(() => {
    window.entityFixture.pendingCanvas = document.querySelector('.iitc-iris-ornaments-canvas');
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  expect(await page.evaluate(() => window.entityFixture.images.every(image => image.onload === null && image.onerror === null))).toBe(true);
  finish();
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'late-image', label: 'late-image', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture late-image');
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  expect(await page.evaluate(() => window.entityFixture.pendingCanvas.isConnected)).toBe(false);
});
