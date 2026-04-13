import { describe, expect, it } from 'vitest';
import mockInventoryData from './mock.inventory.json';
import liveInventoryData from '../../../../../../docs/update-map/get-inventory-20260413.json';
import { countPortalKeys, deriveInventoryDisplayItems, parseInventory } from './parser';
import type { InventoryData } from './types';

describe('inventory parser', () => {
  it('derives expected categories from mock inventory data', () => {
    const parsed = parseInventory(mockInventoryData as InventoryData);
    const derived = deriveInventoryDisplayItems(parsed);
    const categories = new Set(derived.map((item) => item.category));

    expect(categories).toEqual(new Set([
      'WEAPONS',
      'RESONATORS',
      'MODS',
      'POWERUPS',
      'CAPSULES',
      'KEYS',
    ]));
  });

  it('derives power cubes, boosted power cubes, and drones from saved live data', () => {
    const parsed = parseInventory(liveInventoryData as InventoryData);
    const derived = deriveInventoryDisplayItems(parsed);

    expect(derived.some((item) => item.type === 'POWER_CUBE' && item.category === 'POWERUPS')).toBe(true);
    expect(derived.some((item) => item.type === 'BOOSTED_POWER_CUBE' && item.category === 'POWERUPS')).toBe(true);
    expect(derived.some((item) => item.type === 'DRONE' && item.category === 'POWERUPS')).toBe(true);
  });

  it('counts portal keys including keys stored in capsules', () => {
    const parsed = parseInventory({
      result: [
        [
          'loose-key',
          1,
          {
            portalCoupler: {
              portalGuid: 'portal-a',
              portalLocation: '0,0',
              portalImageUrl: '',
              portalTitle: 'Portal A',
              portalAddress: '',
            },
          },
        ],
        [
          'capsule-1',
          2,
          {
            resource: { resourceType: 'CAPSULE', resourceRarity: 'COMMON' },
            moniker: { differentiator: 'C1' },
            container: {
              currentCapacity: 100,
              currentCount: 2,
              stackableItems: [
                {
                  itemGuids: ['nested-key-1', 'nested-key-2'],
                  exampleGameEntity: [
                    'nested-key-template',
                    3,
                    {
                      portalCoupler: {
                        portalGuid: 'portal-a',
                        portalLocation: '0,0',
                        portalImageUrl: '',
                        portalTitle: 'Portal A',
                        portalAddress: '',
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      ],
    } as InventoryData);

    expect(countPortalKeys(parsed, 'portal-a')).toBe(3);
    expect(countPortalKeys(parsed, 'portal-b')).toBe(0);
  });
});
