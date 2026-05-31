import {describe, expect, it} from 'vitest';
import {getIitcInventoryPortalKeyCount, parseIitcInventoryResponse, summarizeIitcInventory, type IitcInventoryResponse} from './inventory';

describe('IITC inventory parser', () => {
  it('summarizes items, keys, and capsule contents from Intel inventory tuples', () => {
    const response: IitcInventoryResponse = {
      result: [
        ['reso-1', 1, {resourceWithLevels: {resourceType: 'EMITTER_A', level: 8}}],
        ['key-1', 2, {
          resource: {resourceType: 'PORTAL_LINK_KEY', resourceRarity: 'VERY_COMMON'},
          portalCoupler: {
            portalGuid: 'portal-a',
            portalLocation: '03123456,04123456',
            portalTitle: 'Portal A',
            portalAddress: 'Address A',
          },
        }],
        ['cap-1', 3, {
          resource: {resourceType: 'KEY_CAPSULE', resourceRarity: 'VERY_RARE'},
          moniker: {differentiator: 'CAPS'},
          container: {
            currentCapacity: 100,
            currentCount: 3,
            stackableItems: [
              {
                itemGuids: ['key-2', 'key-3'],
                exampleGameEntity: ['key-2', 4, {
                  resource: {resourceType: 'PORTAL_LINK_KEY', resourceRarity: 'VERY_COMMON'},
                  portalCoupler: {
                    portalGuid: 'portal-a',
                    portalLocation: '03123456,04123456',
                    portalTitle: 'Portal A',
                    portalAddress: 'Address A',
                  },
                }],
              },
              {
                itemGuids: ['xmp-1'],
                exampleGameEntity: ['xmp-1', 5, {resourceWithLevels: {resourceType: 'EMP_BURSTER', level: 7}}],
              },
            ],
          },
        }],
      ],
    };

    const items = parseIitcInventoryResponse(response);
    const summary = summarizeIitcInventory(items);

    expect(summary.rawItems).toBe(3);
    expect(summary.totalItems).toBe(6);
    expect(summary.itemCounts.find((item) => item.type === 'EMITTER_A')?.count).toBe(1);
    expect(summary.itemCounts.find((item) => item.type === 'EMP_BURSTER')?.capsuleCounts.CAPS).toBe(1);
    expect(summary.capsuleCounts[0]).toMatchObject({id: 'CAPS', type: 'Key Capsule', count: 3, items: 1, keys: 2});
    expect(getIitcInventoryPortalKeyCount(summary, 'portal-a')).toMatchObject({count: 3, capsuleCounts: {CAPS: 2}});
  });
});
