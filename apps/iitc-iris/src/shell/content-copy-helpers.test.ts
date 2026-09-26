import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  copyMapContextGuid,
  copySelectedPortalGuid,
  copySelectedPortalTitle,
} from './content-copy-helpers';

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
});
