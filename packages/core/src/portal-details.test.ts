import {describe, expect, it} from 'vitest';
import {countPortalLinks, mergePortalDetailsForStore} from './portal-details';
import type {Link, Portal} from './store';
import type {PortalDetailsData} from './parsers/intel-types';

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

  it('merges parsed portal details with existing portal map state', () => {
    const existing: Portal = {
      id: 'portal-a',
      lat: 52,
      lng: 4,
      team: 'R',
      name: 'Old name',
      ornaments: ['event'],
    };
    const data: PortalDetailsData = {
      result: [
        'p',
        'ENLIGHTENED',
        52000000,
        4000000,
        6,
        75,
        8,
        'image',
        'New name',
        [],
        false,
        false,
        '',
        '',
        [],
        [],
        'owner',
        '',
        3,
      ],
    };
    const result = mergePortalDetailsForStore(data, {guid: 'portal-a'}, {'portal-a': existing}, [link('out', 'portal-a', 'portal-b')]);

    expect(result?.merged).toMatchObject({
      id: 'portal-a',
      team: 'E',
      name: 'New name',
      level: 6,
      health: 75,
      ornaments: ['event'],
      visited: true,
      captured: true,
    });
    expect(result?.changed).toBe(true);
    expect(result?.teamChanged).toBe(true);
  });
});
