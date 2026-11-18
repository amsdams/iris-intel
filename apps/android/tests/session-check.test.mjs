import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/src/main/assets/session-check.js', import.meta.url), 'utf8')
  .replace('__IRIS_PROBE_KEY__', JSON.stringify('probe'));

async function run(overrides = {}) {
  const requests = [];
  const timers = new Map();
  const page = {
    location: {origin: 'https://intel.ingress.com'},
    window: {PLAYER: {nickname: 'private-name'}},
    document: {
      cookie: 'csrftoken=private-token; irrelevant=private-cookie',
      querySelectorAll: () => [{src: 'https://intel.ingress.com/gen_dashboard_abc123.js'}],
    },
    AbortController,
    setTimeout: (callback) => { timers.set(1, callback); return 1; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (...args) => {
      requests.push(args);
      return {ok: true, json: async () => ({result: false})};
    },
    ...overrides,
  };
  vm.runInNewContext(source, page);
  await new Promise(setImmediate);
  return {page, requests, timers};
}

test('an authenticated non-subscriber passes; secrets remain inside the page request', async () => {
  const {page, requests, timers} = await run();
  assert.match(page.window.probe, /^PASS:/);
  assert.equal(requests.length, 1);
  const [url, request] = requests[0];
  assert.equal(url, '/r/getHasActiveSubscription');
  assert.equal(request.method, 'POST');
  assert.equal(request.credentials, 'same-origin');
  assert.equal(request.redirect, 'error');
  assert.equal(request.headers['X-CSRFToken'], 'private-token');
  assert.equal(request.body, JSON.stringify({v: 'abc123'}));
  assert.doesNotMatch(page.window.probe, /private-name|private-token|private-cookie/);
  assert.equal(timers.size, 0);
});

test('sign-in pages and lookalike origins never run an Intel request', async () => {
  for (const origin of ['https://accounts.google.com', 'https://intel.ingress.com.attacker.test', 'http://intel.ingress.com']) {
    const {page, requests} = await run({location: {origin}});
    assert.equal(requests.length, 0);
    assert.equal(page.window.probe, undefined);
  }
});

test('missing player or request metadata does not send a request or report a pass', async () => {
  for (const overrides of [
    {window: {}},
    {document: {cookie: '', querySelectorAll: () => []}},
  ]) {
    const {page, requests} = await run(overrides);
    assert.equal(requests.length, 0);
    assert.doesNotMatch(page.window.probe, /^PASS:/);
  }
});

test('Intel bootstrap version fallback remains compatible', async () => {
  const {page, requests} = await run({
    window: {PLAYER: {nickname: 'private-name'}, niantic_params: {frontendVersion: 'version-fallback'}},
    document: {cookie: 'csrftoken=private-token', querySelectorAll: () => []},
  });
  assert.match(page.window.probe, /^PASS:/);
  assert.equal(requests[0][1].body, JSON.stringify({v: 'version-fallback'}));
});

test('HTTP failures, HTML login responses, and malformed payloads never report success', async () => {
  for (const response of [
    {ok: false, status: 403},
    {ok: true, json: async () => { throw new SyntaxError('private login HTML'); }},
    {ok: true, json: async () => ({error: 'private server detail', result: true})},
    {ok: true, json: async () => ({result: 'true'})},
    {ok: true, json: async () => ({})},
  ]) {
    const {page, timers} = await run({fetch: async () => response});
    assert.doesNotMatch(page.window.probe, /^PASS:|private/);
    assert.equal(timers.size, 0);
  }
});

test('network failure does not expose raw errors', async () => {
  const {page, timers} = await run({fetch: async () => { throw new Error('private URL or token'); }});
  assert.match(page.window.probe, /could not be verified/);
  assert.doesNotMatch(page.window.probe, /private/);
  assert.equal(timers.size, 0);
});

test('a hung request aborts and releases its timeout', async () => {
  const {page, timers} = await run({fetch: (_url, request) => new Promise((_resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
  })});
  assert.equal(timers.size, 1);
  timers.get(1)();
  await new Promise(setImmediate);
  assert.match(page.window.probe, /could not be verified/);
  assert.equal(timers.size, 0);
});
