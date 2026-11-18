import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../app/src/main/assets/load-iris.js', import.meta.url), 'utf8')
  .replace('__IRIS_PROBE_KEY__', JSON.stringify('probe'));

async function run(options = {}) {
  const appended = [];
  const messages = [];
  const listeners = new Map();
  const timers = new Map();
  const nodes = new Map();
  const window = {
    PLAYER: options.player === false ? undefined : {nickname: 'private-name'},
    addEventListener: (name, listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener: (name, listener) => listeners.get(name)?.delete(listener),
    postMessage: (message, origin) => {
      messages.push({message, origin});
      if (options.reply === false) return;
      queueMicrotask(() => emit('message', {
        source: window, origin, data: {type: 'IITC_IRIS_DRAW_TOOLS_STATUS', drawToolsItems: ['private-marker']},
        ...options.reply,
      }));
    },
  };
  function emit(name, event) { for (const listener of [...(listeners.get(name) || [])]) listener(event); }
  const appendChild = (element) => {
    appended.push(element);
    queueMicrotask(() => {
      if (element.src && options.ready !== false) {
        nodes.set('iitc-iris-root', {});
        nodes.set('iitc-iris-map', {});
        window.__iitcIrisPageRuntimeInitialized = true;
        window.__iitcIrisMap = {};
      }
      if (options.failAsset && element.href?.endsWith(options.failAsset)) element.onerror?.();
      else element.onload?.();
    });
  };
  const page = {
    location: {origin: options.origin || 'https://intel.ingress.com'},
    window,
    document: {
      body: {}, head: {appendChild},
      createElement: (tag) => ({tag}),
      querySelector: () => null,
      getElementById: (id) => nodes.get(id),
    },
    setTimeout: (callback) => { timers.set(1, callback); return 1; },
    clearTimeout: (id) => timers.delete(id),
  };
  const context = vm.createContext(page);
  vm.runInContext(script, context);
  await new Promise(setImmediate);
  return {window, appended, messages, timers, listeners, emit, context};
}

test('loads bundled styles before UI and proves the existing read-only runtime round trip', async () => {
  const {window, appended, messages, timers, listeners} = await run();
  assert.match(window.probe, /^PASS:/);
  assert.doesNotMatch(window.probe, /private-name|private-marker/);
  assert.deepEqual(appended.filter((element) => element.href || element.src).map((element) => element.href || element.src), [
    'https://intel.ingress.com/__iris_android__/leaflet.css',
    'https://intel.ingress.com/__iris_android__/iitc-iris.css',
    'https://intel.ingress.com/__iris_android__/content.js',
  ]);
  assert.equal(appended.find((element) => element.name === 'iitc-iris-asset-base').content,
    'https://intel.ingress.com/__iris_android__/');
  assert.equal(messages[0].message.type, 'IITC_IRIS_DRAW_TOOLS');
  assert.equal(messages[0].message.drawToolsAction, 'requestStatus');
  assert.equal(messages[0].origin, 'https://intel.ingress.com');
  assert.equal(timers.size, 0);
  for (const set of listeners.values()) assert.equal(set.size, 0);
});

test('login pages and unrelated origins never receive IRIS assets or messages', async () => {
  for (const options of [{player: false}, {origin: 'https://accounts.google.com'},
    {origin: 'https://intel.ingress.com.attacker.test'}, {origin: 'http://intel.ingress.com'}]) {
    const {window, appended, messages, timers} = await run(options);
    assert.doesNotMatch(window.probe || '', /^PASS:/);
    assert.equal(appended.length, 0);
    assert.equal(messages.length, 0);
    assert.equal(timers.size, 0);
  }
});

test('failed bundled CSS stops UI loading and exposes no raw error details', async () => {
  const {window, appended, messages, timers} = await run({failAsset: 'iitc-iris.css'});
  assert.match(window.probe, /could not load/);
  assert.equal(appended.filter((element) => element.src).length, 0);
  assert.equal(messages.length, 0);
  assert.equal(timers.size, 0);
});

test('missing runtime or reply times out instead of claiming successful injection', async () => {
  for (const options of [{ready: false}, {reply: false}, {reply: {source: {}}},
    {reply: {origin: 'https://accounts.google.com'}},
    {reply: {data: {type: 'IITC_IRIS_DRAW_TOOLS_STATUS', drawToolsItems: 'invalid'}}}]) {
    const {window, timers, listeners} = await run(options);
    assert.equal(window.probe, 'Loading IRIS…');
    [...timers.values()][0]();
    assert.match(window.probe, /timed out/);
    assert.equal(timers.size, 0);
    for (const set of listeners.values()) assert.equal(set.size, 0);
  }
});

test('navigation cancels pending work and releases listeners and timers', async () => {
  const {window, emit, timers, listeners} = await run({ready: false});
  emit('pagehide', {});
  assert.match(window.probe, /cancelled/);
  assert.equal(timers.size, 0);
  for (const set of listeners.values()) assert.equal(set.size, 0);
});

test('rechecking an injected page reuses assets and performs another round trip', async () => {
  const {window, context, appended, messages} = await run();
  const count = appended.length;
  vm.runInContext(script, context);
  await new Promise(setImmediate);
  assert.match(window.probe, /^PASS:/);
  assert.equal(appended.length, count);
  assert.equal(messages.length, 2);
});
