import {describe, expect, it} from 'vitest';
import {formatInventoryItemLabel, formatInventoryRarity} from './inventory-item-display';

describe('Inventory item presentation', () => {
  it.each([
    ['EMITTER_A', 'Resonator 8', 8, 'Resonator'],
    ['EMP_BURSTER', 'XMP 8', 8, 'XMP Burster'],
    ['POWER_CUBE', 'Power Cube 6', 6, 'Power Cube'],
    ['ULTRA_STRIKE', 'Ultra Strike 7', 7, 'Ultra Strike'],
    ['EMITTER_A', 'Resonator L8', 8, 'Resonator'],
    ['EMITTER_A', 'Resonator', 8, 'Resonator'],
    ['RES_SHIELD', 'Shield', undefined, 'Shield'],
    ['FLIP_CARD', 'Virus ADA', undefined, 'Virus ADA'],
  ] as const)('labels %s without repeating the level badge', (type, label, level, expected) => {
    expect(formatInventoryItemLabel({type, label, level})).toBe(expected);
  });

  it.each([
    ['COMMON', 'C', 'Common'],
    ['RARE', 'R', 'Rare'],
    ['VERY_RARE', 'VR', 'Very rare'],
    ['VERY_COMMON', 'VC', 'Very common'],
    ['SPECIAL', '?', 'Special'],
    [undefined, '?', 'Rarity unavailable'],
  ] as const)('provides a rarity badge and full accessible label for %s', (rarity, badge, label) => {
    expect(formatInventoryRarity(rarity)).toEqual({badge, label});
  });
});
