import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  copyMapContextGuid,
  copyMapContextLatLng,
  copyMapContextUrl,
  copyMapContextPortalGuids,
  copySelectedPortalLink,
  copySelectedPortalGuid,
  copySelectedPortalTitle,
} from './copy-helpers';
import type {IitcIrisMapContextSelection} from '../portals/selection-lifecycle';

function makeMapContext(overrides?: Partial<IitcIrisMapContextSelection>): IitcIrisMapContextSelection {
  return {lat: 52.37, lng: 4.89, zoom: 14, target: 'map', ...overrides};
}

describe('content-copy-helpers', () => {
  beforeEach(() => {
    (globalThis as unknown as {window: unknown}).window = globalThis;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
  });

  it('does nothing when selected portal is null', () => {
    const setStatus = vi.fn();
    copySelectedPortalGuid(null, setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('formats portal title fallback to guid when title is missing', async () => {
    const setStatus = vi.fn();
    const portal = {guid: 'abc123456789', latE6: 52300000, lngE6: 4900000};
    copySelectedPortalTitle(portal, setStatus);
    await Promise.resolve();
    expect(setStatus).toHaveBeenCalledWith('portal title copied');
  });

  it('does nothing when mapContext has no guid', () => {
    const setStatus = vi.fn();
    copyMapContextGuid(null, setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('copyMapContextLatLng is a no-op when context is null', () => {
    copyMapContextLatLng(null, vi.fn());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copyMapContextUrl is a no-op when context is null', () => {
    copyMapContextUrl(null, vi.fn());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copyMapContextGuid is a no-op when context has no guid', () => {
    const setStatus = vi.fn();
    copyMapContextGuid(makeMapContext({guid: undefined}), setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('copyMapContextPortalGuids is a no-op when no portal guids are present', () => {
    const setStatus = vi.fn();
    copyMapContextPortalGuids(makeMapContext({portalGuids: []}), setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('copySelectedPortalLink is a no-op when portal is null', () => {
    const setStatus = vi.fn();
    copySelectedPortalLink(null, 14, setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('copySelectedPortalTitle is a no-op when portal is null', () => {
    const setStatus = vi.fn();
    copySelectedPortalTitle(null, setStatus);
    expect(setStatus).not.toHaveBeenCalled();
  });
});
