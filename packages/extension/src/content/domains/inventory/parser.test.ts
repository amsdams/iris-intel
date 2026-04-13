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

  it('uses human-readable Intel-style inventory labels for derived items', () => {
    const parsed = parseInventory({
      result: [
        [
          'reso-1',
          1,
          {
            resourceWithLevels: { resourceType: 'EMITTER_A', level: 8 },
          },
        ],
        [
          'apex-1',
          2,
          {
            playerPowerupResource: { playerPowerupEnum: 'APEX' },
          },
        ],
        [
          'ultra-link-1',
          2,
          {
            modResource: { displayName: 'SoftBank Ultra Link', rarity: 'VERY_RARE', resourceType: 'ULTRA_LINK_AMP' },
          },
        ],
        [
          'frack-1',
          3,
          {
            timedPowerupResource: { designation: 'FRACK', multiplier: 0, multiplierE6: 2000000 },
          },
        ],
        [
          'capsule-1',
          4,
          {
            resource: { resourceType: 'KEY_CAPSULE', resourceRarity: 'COMMON' },
            container: { currentCapacity: 100, currentCount: 0, stackableItems: [] },
          },
        ],
        [
          'battle-beacon-1',
          5,
          {
            timedPowerupResource: { designation: 'BB_BATTLE', multiplier: 0, multiplierE6: 1000000 },
            resource: { resourceType: 'PORTAL_POWERUP', resourceRarity: 'VERY_RARE' },
          },
        ],
      ],
    } as InventoryData);

    const derived = deriveInventoryDisplayItems(parsed);

    expect(derived.find((item) => item.guid === 'reso-1')?.name).toBe('Resonator');
    expect(derived.find((item) => item.guid === 'apex-1')?.name).toBe('Apex Mod');
    expect(derived.find((item) => item.guid === 'ultra-link-1')?.name).toBe('Ultra Link');
    expect(derived.find((item) => item.guid === 'frack-1')?.name).toBe('Portal Fracker');
    expect(derived.find((item) => item.guid === 'capsule-1')?.name).toBe('Key Capsule');
    expect(derived.find((item) => item.guid === 'battle-beacon-1')?.name).toBe('Very Rare Battle Beacon');
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

  it('derives capsule-contained items for display and preserves capsule monikers', () => {
    const parsed = parseInventory({
      result: [
        [
          'capsule-1',
          1,
          {
            resource: { resourceType: 'CAPSULE', resourceRarity: 'COMMON' },
            moniker: { differentiator: 'C1' },
            container: {
              currentCapacity: 100,
              currentCount: 3,
              stackableItems: [
                {
                  itemGuids: ['nested-key-1', 'nested-key-2'],
                  exampleGameEntity: [
                    'nested-key-template',
                    2,
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
                {
                  itemGuids: ['nested-cube-1'],
                  exampleGameEntity: [
                    'nested-cube-template',
                    3,
                    {
                      resource: { resourceType: 'POWER_CUBE', resourceRarity: 'COMMON' },
                      resourceWithLevels: { resourceType: 'POWER_CUBE', level: 8 },
                    },
                  ],
                },
              ],
            },
          },
        ],
      ],
    } as InventoryData);

    const derived = deriveInventoryDisplayItems(parsed);
    const capsule = derived.find((item) => item.category === 'CAPSULES');
    const nestedKeys = derived.filter((item) => item.category === 'KEYS');
    const nestedPowerCubes = derived.filter((item) => item.type === 'POWER_CUBE');

    expect(capsule?.moniker).toBe('C1');
    expect(nestedKeys).toHaveLength(2);
    expect(nestedKeys.every((item) => item.moniker === 'C1')).toBe(true);
    expect(nestedPowerCubes).toHaveLength(1);
    expect(nestedPowerCubes[0]?.category).toBe('POWERUPS');
    expect(nestedPowerCubes[0]?.moniker).toBe('C1');
  });
});
