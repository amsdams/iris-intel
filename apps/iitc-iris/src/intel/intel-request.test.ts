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
