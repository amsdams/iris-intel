import {afterEach, describe, expect, it, vi} from 'vitest';
import type {IitcIrisMapLifetime} from '../map/map-runtime-lifetime';
import {createIntelRequest} from './intel-request';

function lifetime(fetchText: IitcIrisMapLifetime['fetchText']): IitcIrisMapLifetime {
  return {fetchText, signal: new AbortController().signal, schedule: vi.fn(), cancelScheduled: vi.fn(),
    requestFrame: vi.fn(), dispose: vi.fn()};
}

afterEach(() => vi.restoreAllMocks());
describe('Intel request transport lifetime', () => {
  it('uses the lifetime current at dispatch and balances diagnostics on rejection', async () => {
    const finish = vi.fn();
    const beginRequest = vi.fn(() => finish);
    const old = vi.fn<IitcIrisMapLifetime['fetchText']>().mockRejectedValue(new DOMException('Removed', 'AbortError'));
    const current = vi.fn<IitcIrisMapLifetime['fetchText']>().mockResolvedValue({response: new Response(), text: '{}'});
    let active = lifetime(old);
    const transport = createIntelRequest({getLifetime: () => active, beginRequest});
    const signal = new AbortController().signal;
    const pending = transport.fetchIitcEndpointText('getEntities', {method: 'POST', signal}, 'entities');
    active = lifetime(current);
    await expect(pending).rejects.toMatchObject({name: 'AbortError'});
    expect(old).toHaveBeenCalledWith('/r/getEntities', {method: 'POST', signal});
    expect(current).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledOnce();
    await transport.fetchIitcEndpointText('getPortalDetails', {method: 'POST'}, 'portal-details');
    expect(current).toHaveBeenCalledWith('/r/getPortalDetails', {method: 'POST'});
    expect(beginRequest.mock.calls).toEqual([
      ['getEntities', 'entities'], ['getPortalDetails', 'portal-details'],
    ]);
    expect(finish).toHaveBeenCalledTimes(2);
  });

  it('does not begin a diagnostic request when no map lifetime exists', async () => {
    const beginRequest = vi.fn();
    const transport = createIntelRequest({getLifetime: () => undefined, beginRequest});
    await expect(transport.fetchIitcEndpointText('getEntities', {})).rejects.toMatchObject({name: 'AbortError'});
    expect(beginRequest).not.toHaveBeenCalled();
  });
});

describe('Authenticated Intel JSON endpoints', () => {
  afterEach(() => vi.unstubAllGlobals());
  function setup(text = '{"result":true}', status = 200): {transport: ReturnType<typeof createIntelRequest>;
    fetchText: ReturnType<typeof vi.fn<IitcIrisMapLifetime['fetchText']>>; beginRequest: ReturnType<typeof vi.fn>; finish: ReturnType<typeof vi.fn>} {
    vi.stubGlobal('document', {cookie: 'csrftoken=token', querySelectorAll: () => []});
    vi.stubGlobal('window', {niantic_params: {CURRENT_VERSION: 'current'}});
    const fetchText = vi.fn<IitcIrisMapLifetime['fetchText']>().mockResolvedValue({response: new Response(null, {status}), text});
    const finish = vi.fn();
    const beginRequest = vi.fn(() => finish);
    const transport = createIntelRequest({getLifetime: () => lifetime(fetchText), beginRequest});
    return {transport, fetchText, beginRequest, finish};
  }

  it('preserves endpoint grouping, headers, version override and caller cancellation signal', async () => {
    const {transport, fetchText, beginRequest, finish} = setup();
    const signal = new AbortController().signal;
    await expect(transport.postIntelEndpoint('getInventory', {lastQueryTimestamp: 0, v: 'old'}, signal)).resolves.toEqual({result: true});
    expect(fetchText).toHaveBeenCalledWith('/r/getInventory', {method: 'POST', credentials: 'include', signal,
      headers: {'Accept': 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': 'token', 'X-Requested-With': 'XMLHttpRequest'},
      body: '{"lastQueryTimestamp":0,"v":"current"}'});
    expect(beginRequest).toHaveBeenCalledWith('getInventory', 'getInventory');
    expect(finish).toHaveBeenCalledOnce();
  });

  it('rejects missing credentials/version before dispatching', async () => {
    const {transport, fetchText} = setup();
    document.cookie = '';
    await expect(transport.postIntelEndpoint('getInventory', {})).rejects.toThrow('getInventory missing csrftoken');
    document.cookie = 'csrftoken=token';
    (window as Window & {niantic_params?: unknown}).niantic_params = {};
    await expect(transport.postIntelEndpoint('getInventory', {})).rejects.toThrow('getInventory missing Intel version');
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('retains auth HTML, server errors and JSON parse failure with balanced request counts', async () => {
    const {transport, fetchText, finish} = setup(' <html>login</html>');
    await expect(transport.postIntelEndpoint('redeemReward', {})).rejects.toThrow('redeemReward returned login html HTTP 200');
    fetchText.mockResolvedValueOnce({response: new Response(), text: '{"error":"DENIED"}'});
    await expect(transport.postIntelEndpoint('redeemReward', {})).rejects.toThrow('DENIED');
    fetchText.mockResolvedValueOnce({response: new Response(), text: 'invalid json'});
    await expect(transport.postIntelEndpoint('redeemReward', {})).rejects.toBeInstanceOf(SyntaxError);
    expect(finish).toHaveBeenCalledTimes(3);
  });

  it('keeps the existing JSON handling of non-OK HTTP responses during extraction', async () => {
    const {transport} = setup('{"result":false}', 503);
    await expect(transport.postIntelEndpoint('getInventory', {})).resolves.toEqual({result: false});
  });
});
