import { describe, expect, it } from 'vitest';
import {
  createIntelUrl,
  formatLinkLength,
  formatMapObjectDistance,
  formatRenderMutationSummary,
  formatSelectedPortal,
  formatTeamLabel,
  getPortalLatLng,
} from './content-map-status';

describe('content-map-status', () => {
  it('formats intel URL correctly from camera state', () => {
    const url = createIntelUrl({
      lat: 52.3730796,
      lng: 4.8924534,
      zoom: 15,
      bounds: null,
    });
    expect(url).toBe('https://intel.ingress.com/intel?ll=52.373080,4.892453&z=15');
  });

  it('formats link length properly', () => {
    expect(formatLinkLength(500)).toBe('500m');
    expect(formatLinkLength(2500)).toBe('2.5km');
  });

  it('formats team labels cleanly', () => {
    expect(formatTeamLabel('E')).toBe('Enlightened');
    expect(formatTeamLabel('R')).toBe('Resistance');
    expect(formatTeamLabel('M')).toBe('Machina');
    expect(formatTeamLabel('N')).toBe('Neutral');
    expect(formatTeamLabel('custom')).toBe('custom');
  });

  it('formats map object distance with proper precision', () => {
    expect(formatMapObjectDistance(undefined)).toBe('-');
    expect(formatMapObjectDistance(450)).toBe('450 m');
    expect(formatMapObjectDistance(1500)).toBe('1.50 km');
    expect(formatMapObjectDistance(15000)).toBe('15.0 km');
  });

  it('formats selected portal details label', () => {
    expect(formatSelectedPortal(null)).toBe('none');
    expect(
      formatSelectedPortal({
        guid: 'test-guid-12345',
        title: 'Test Portal',
        team: 'E',
        level: 8,
      }),
    ).toBe('Test Portal EL8');

    expect(
      getPortalLatLng({
        latE6: 52373079,
        lngE6: 4892453,
      }),
    ).toEqual({ lat: 52.373079, lng: 4.892453 });
  });

  it('formats render mutation summary', () => {
    expect(formatRenderMutationSummary(null)).toBe('render -');
    const emptyLayer = { added: 0, removed: 0, unchanged: 0, replaced: 0 };
    expect(
      formatRenderMutationSummary({
        mode: 'incremental',
        fields: emptyLayer,
        links: emptyLayer,
        portals: { added: 5, removed: 1, unchanged: 10, replaced: 0 },
      }),
    ).toBe('inc p +5/-1/~10/r0');
  });
});
