import {describe, expect, it} from 'vitest';
import {countPortalLinks, mergePortalDetailsForStore} from './portal-details';
import {mockLink, mockPortal, mockPortalDetailsData} from './mock-intel';
import type {Portal} from './store';

describe('portal details helpers', () => {
  it('counts incoming and outgoing links for mitigation parsing', () => {
    expect(countPortalLinks([
      mockLink({id: 'out', fromPortalId: 'portal-a', toPortalId: 'portal-b'}),
      mockLink({id: 'in', fromPortalId: 'portal-c', toPortalId: 'portal-a'}),
      mockLink({id: 'other', fromPortalId: 'portal-c', toPortalId: 'portal-b'}),
    ], 'portal-a')).toBe(2);
  });

  it('returns zero for missing portal ids', () => {
    expect(countPortalLinks([mockLink({id: 'out', fromPortalId: 'portal-a', toPortalId: 'portal-b'})], '')).toBe(0);
  });

  it('merges parsed portal details with existing portal map state', () => {
    const existing: Portal = mockPortal({
      team: 'R',
      name: 'Old name',
      ornaments: ['event'],
    });
    const data = mockPortalDetailsData({
      team: 'ENLIGHTENED',
      latE6: 52000000,
      lngE6: 4000000,
      level: 6,
      health: 75,
      image: 'image',
      name: 'New name',
      owner: 'owner',
      history: 3,
    });
    const result = mergePortalDetailsForStore(data, {guid: 'portal-a'}, {'portal-a': existing}, [mockLink({id: 'out', fromPortalId: 'portal-a', toPortalId: 'portal-b'})]);

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
