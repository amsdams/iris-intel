import {afterEach, describe, expect, it, vi} from 'vitest';
import {getExtensionUrl} from './assets';

afterEach(() => vi.unstubAllGlobals());

describe('bundled asset URLs', () => {
  it('uses the extension runtime for images and injected scripts', () => {
    const getURL = vi.fn((path: string) => `chrome-extension://iris/${path}`);
    vi.stubGlobal('chrome', {runtime: {getURL}});
    expect(getExtensionUrl('images/mission-length.png')).toBe('chrome-extension://iris/images/mission-length.png');
    expect(getExtensionUrl('page-map-runtime.js')).toBe('chrome-extension://iris/page-map-runtime.js');
  });

  it('keeps relative paths in a browser without extension APIs', () => {
    vi.stubGlobal('chrome', undefined);
    expect(getExtensionUrl('images/mission-length.png')).toBe('images/mission-length.png');
    vi.stubGlobal('chrome', {});
    expect(getExtensionUrl('page-map-runtime.js')).toBe('page-map-runtime.js');
  });
});
