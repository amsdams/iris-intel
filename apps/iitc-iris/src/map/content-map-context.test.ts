import { describe, expect, it } from 'vitest';
import {
  formatAnchorPortalGuids,
  formatMapContextIntelUrl,
  formatMapContextLatLng,
  formatPortalIntelUrl,
  getDrawToolsTargetFromContext,
} from './content-map-context';

describe('content-map-context', () => {
  it('formats map context lat/lng text cleanly', () => {
    expect(formatMapContextLatLng(52.3730796, 4.8924534)).toBe('52.373080,4.892453');
  });

  it('formats map context intel URL properly', () => {
    const url = formatMapContextIntelUrl(52.3730796, 4.8924534, 15.4);
    expect(url).toBe('https://intel.ingress.com/intel?ll=52.373080,4.892453&z=15');
  });

  it('formats portal intel URL with pll and minimum zoom 17', () => {
    const portal = { latE6: 52373079, lngE6: 4892453 };
    expect(formatPortalIntelUrl(portal, 14)).toBe(
      'https://intel.ingress.com/intel?ll=52.373079,4.892453&z=17&pll=52.373079,4.892453',
    );
    expect(formatPortalIntelUrl(portal, 18)).toBe(
      'https://intel.ingress.com/intel?ll=52.373079,4.892453&z=18&pll=52.373079,4.892453',
    );
  });

  it('formats anchor portal GUIDs separated by newlines', () => {
    expect(formatAnchorPortalGuids(['guid-1', 'guid-2'])).toBe('guid-1\nguid-2');
  });

  it('resolves draw tools target prioritizing selected portal over map context', () => {
    const portal = { latE6: 52373079, lngE6: 4892453, title: 'Portal A', guid: 'guid-a' };
    const context = { lat: 10, lng: 20 };

    expect(getDrawToolsTargetFromContext(portal, context)).toEqual({
      lat: 52.373079,
      lng: 4.892453,
      label: 'Portal A',
    });

    expect(getDrawToolsTargetFromContext(null, context)).toEqual({
      lat: 10,
      lng: 20,
      label: '10.000000, 20.000000',
    });

    expect(getDrawToolsTargetFromContext(null, null)).toBeNull();
  });
});
