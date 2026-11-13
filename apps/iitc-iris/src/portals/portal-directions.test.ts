import {describe, expect, it} from 'vitest';
import {getPortalDirections} from './portal-directions';

describe('portal map links', () => {
  it('keeps Google coordinate-only and encodes the portal title for Bing', () => {
    const links = getPortalDirections({latE6: 52370123, lngE6: 4893123, title: 'A & B #1 (portal)'});
    if (!links) throw new Error('Expected map links for valid portal coordinates');
    const url = new URL(links.google);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
    expect([...url.searchParams]).toEqual([['api', '1'], ['query', '52.370123,4.893123']]);
    expect(links.google).not.toContain('(');
    expect(new URL(links.bing).searchParams.get('sp')).toBe('Point.52.370123_4.893123_A & B #1 (portal)___');
    expect(links.osm).toBe('https://www.openstreetmap.org/?mlat=52.370123&mlon=4.893123&zoom=16');
    const directions = new URL(links.osmDirections);
    expect(directions.pathname).toBe('/directions');
    expect([...directions.searchParams]).toEqual([['to', '52.370123,4.893123']]);
    expect(directions.hash).toBe('#map=16/52.370123/4.893123');
    expect(links.geo).toBe('geo:52.370123,4.893123');
  });

  it('supports zero, negative coordinates and coordinate boundaries', () => {
    expect(getPortalDirections({latE6: 0, lngE6: 0})?.geo).toBe('geo:0,0');
    expect(getPortalDirections({latE6: -90000000, lngE6: -180000000})?.geo).toBe('geo:-90,-180');
  });

  it.each([[NaN, 0], [0, Infinity], [90000001, 0], [0, -180000001]])(
    'does not offer directions for invalid coordinates %s, %s', (latE6, lngE6) => {
      expect(getPortalDirections({latE6, lngE6})).toBeUndefined();
    },
  );
});
