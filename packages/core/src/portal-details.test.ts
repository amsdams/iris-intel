import {describe, expect, it} from 'vitest';
import {countPortalLinks} from './portal-details';
import type {Link} from './store';

function link(id: string, fromPortalId: string, toPortalId: string): Link {
  return {
    id,
    fromPortalId,
    toPortalId,
    team: 'E',
    fromLat: 52,
    fromLng: 4,
    toLat: 53,
    toLng: 5,
  };
}

describe('portal details helpers', () => {
  it('counts incoming and outgoing links for mitigation parsing', () => {
    expect(countPortalLinks([
      link('out', 'portal-a', 'portal-b'),
      link('in', 'portal-c', 'portal-a'),
      link('other', 'portal-c', 'portal-b'),
    ], 'portal-a')).toBe(2);
  });

  it('returns zero for missing portal ids', () => {
    expect(countPortalLinks([link('out', 'portal-a', 'portal-b')], '')).toBe(0);
  });
});
