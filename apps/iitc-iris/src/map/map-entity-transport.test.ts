import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {isIitcAuthError} from '../intel/intel-request';
import {createMapEntityTransport} from './map-entity-transport';

type Options = Parameters<typeof createMapEntityTransport>[0];
const text = (body: string, status = 200): Awaited<ReturnType<Options['fetchIitcEndpointText']>> =>
  ({response: new Response(null, {status}), text: body});

describe('map endpoint transport', () => {
  const fetchEndpoint = vi.fn<Options['fetchIitcEndpointText']>();
  beforeEach(() => {
    fetchEndpoint.mockReset();
    vi.stubGlobal('document', {cookie: 'csrftoken=first'});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads current CSRF/version inputs and preserves request body, group and abort signal', async () => {
    fetchEndpoint.mockResolvedValue(text('{"result":{"map":{}}}'));
    const transport = createMapEntityTransport({getLifetime: () => undefined, fetchIitcEndpointText: fetchEndpoint});
    vi.stubGlobal('document', {cookie: 'csrftoken=current'});
    const signal = new AbortController().signal;
    await transport.fetchEntityBatchResult(['one', 'two'], 'version', signal);
    expect(fetchEndpoint).toHaveBeenCalledExactlyOnceWith('getEntities', {
      method: 'POST', credentials: 'include', signal,
      headers: {'Accept': 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': 'current', 'X-Requested-With': 'XMLHttpRequest'},
      body: JSON.stringify({tileKeys: ['one', 'two'], v: 'version'}),
    }, 'entities');
  });

  it('keeps authentication errors distinct from HTTP, empty-body and JSON errors without retrying', async () => {
    const transport = createMapEntityTransport({getLifetime: () => undefined, fetchIitcEndpointText: fetchEndpoint});
    for (const [reply, expected, auth] of [
      [text('<html>login</html>'), 'getEntities returned login html HTTP 200', true],
      [text('unavailable', 503), 'getEntities failed HTTP 503', false],
      [text('  '), 'getEntities returned empty response', false],
      [text('invalid-json'), 'getEntities returned non-JSON HTTP 200:', false],
    ] as const) {
      fetchEndpoint.mockResolvedValueOnce(reply);
      const result = await transport.fetchEntityBatchResult(['tile'], 'v', new AbortController().signal);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(expected);
      expect(isIitcAuthError(result.error)).toBe(auth);
    }
    expect(fetchEndpoint).toHaveBeenCalledTimes(4);
    vi.stubGlobal('document', {cookie: ''});
    const result = await transport.fetchEntityBatchResult(['tile'], 'v', new AbortController().signal);
    expect(isIitcAuthError(result.error)).toBe(true);
    expect(fetchEndpoint).toHaveBeenCalledTimes(4);
  });

  it('keeps artifact error/empty-result semantics separate from normal entity parsing', async () => {
    const transport = createMapEntityTransport({getLifetime: () => undefined, fetchIitcEndpointText: fetchEndpoint});
    for (const payload of ['{"error":"RETRY"}', '{}', '{"result":{}}']) {
      fetchEndpoint.mockResolvedValueOnce(text(payload));
      expect(await transport.fetchArtifactPortals('v')).toEqual([]);
    }
    expect(fetchEndpoint.mock.lastCall?.[2]).toBe('artifacts');
    fetchEndpoint.mockResolvedValueOnce(text('<html>login</html>'));
    await expect(transport.fetchArtifactPortals('v')).rejects.toThrow('getArtifactPortals returned login html HTTP 200');
  });

  it('uses the current map lifetime for fixture reads and reports its HTTP failure', async () => {
    let available = false;
    const fetchText = vi.fn().mockResolvedValue(text('{"result":{"map":{}}}'));
    const transport = createMapEntityTransport({getLifetime: () => available ? {fetchText} : undefined, fetchIitcEndpointText: fetchEndpoint});
    const fixture = {mode: 'fixture', id: 'test', label: 'test', url: '/fixture.json'} as const;
    await expect(transport.fetchFixtureResponse(fixture)).rejects.toMatchObject({name: 'AbortError'});
    available = true;
    expect(await transport.fetchFixtureResponse(fixture)).toEqual({result: {map: {}}});
    expect(fetchText).toHaveBeenCalledExactlyOnceWith('/fixture.json');
    fetchText.mockResolvedValueOnce(text('missing', 404));
    await expect(transport.fetchFixtureResponse(fixture)).rejects.toThrow('fixture test failed HTTP 404');
    expect(fetchEndpoint).not.toHaveBeenCalled();
  });
});
