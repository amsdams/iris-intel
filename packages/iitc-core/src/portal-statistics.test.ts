import {describe, expect, it} from 'vitest';
import {getIitcPortalApGain, getIitcPortalRange, getIitcPortalStatistics, type IitcPortalStatisticsInput} from './portal-statistics';

const portal = (level = 8): IitcPortalStatisticsInput => ({team: 'R', level, resCount: 8, mods: [],
  resonators: Array.from({length: 8}, () => ({level, owner: 'Other', energy: 500}))});
const mod = (stat: string, value: number): IitcPortalStatisticsInput['mods'][number] => ({name: '', owner: '', rarity: '', stats: {[stat]: value}});

describe('IITC portal statistics', () => {
  it('uses fractional resonator level and sorted diminishing link amplifier bonuses', () => {
    const input = portal();
    input.resonators = [...input.resonators.slice(1), {level: 7, owner: 'Other', energy: 500}];
    input.mods = [mod('LINK_RANGE_MULTIPLIER', 2000), mod('LINK_RANGE_MULTIPLIER', 7000)];
    const range = getIitcPortalRange(input);
    expect(range.base).toBe(160 * 7.875 ** 4);
    expect(range.boost).toBe(7.5);
    expect(range.range).toBe(range.base * 7.5);
    expect(range.isLinkable).toBe(true);
    input.resCount = 7;
    expect(getIitcPortalRange(input).isLinkable).toBe(false);
  });

  it('uses Machina next-level ranges without mod boost and neutral empty range', () => {
    expect(getIitcPortalRange({...portal(4), team: 'M', mods: [mod('LINK_RANGE_MULTIPLIER', 7000)]}))
      .toMatchObject({base: 500, boost: 1, range: 500});
    expect(getIitcPortalRange({...portal(), team: 'N', resCount: 0, resonators: []}).range).toBe(0);
  });

  it('calculates energy, outgoing capacity and exact faction/mod hack cooldowns', () => {
    const input = {...portal(), mods: [mod('HACK_SPEED', 500000), mod('HACK_SPEED', 200000),
      mod('BURNOUT_INSULATION', 12), mod('BURNOUT_INSULATION', 8), mod('OUTGOING_LINKS_BONUS', 8)]};
    const stats = getIitcPortalStatistics(input, 0, 0, {team: 'R'});
    expect(stats.currentEnergy).toBe(4000);
    expect(stats.totalEnergy).toBe(48000);
    expect(stats.maxOutgoingLinks).toBe(16);
    expect(stats.hacks).toMatchObject({count: 20, cooldown: 81, burnout: 1539});
    expect(getIitcPortalStatistics(input, 0, 0, {team: 'E'}).hacks.cooldown).toBe(135);
    expect(getIitcPortalStatistics(input, 0, 0).hacks.cooldown).toBeUndefined();
  });

  it('accounts for ownership and agent level in friendly upgrades and preserves enemy AP', () => {
    const input = {...portal(1), resCount: 7, resonators: portal(1).resonators.slice(1)};
    const stats = getIitcPortalApGain(input, 2, 3, {nickname: 'Me', level: 8, team: 'R'});
    expect(stats).toMatchObject({deployCount: 1, upgradeCount: 7, friendlyAp: 830,
      resoAp: 525, linkAp: 374, fieldAp: 2250, captureAp: 1925, destroyAp: 3149, enemyAp: 5074});
    expect(getIitcPortalApGain(portal(8), 0, 0, {nickname: 'Me', level: 8}).friendlyAp).toBe(0);
    expect(getIitcPortalApGain(input, 0, 0).friendlyAp).toBeUndefined();
  });

  it('stacks attack mods and orders turret effectiveness by hit bonus rather than attack frequency', () => {
    const input = {...portal(), mods: [mod('FORCE_AMPLIFIER', 2000), mod('FORCE_AMPLIFIER', 3000),
      {...mod('HIT_BONUS', 100000), stats: {HIT_BONUS: 100000, ATTACK_FREQUENCY: 5000}},
      {...mod('HIT_BONUS', 200000), stats: {HIT_BONUS: 200000, ATTACK_FREQUENCY: 1000}}]};
    expect(getIitcPortalStatistics(input, 0, 0).attack)
      .toEqual({forceAmplifier: 3.5, frequency: 2.25, hitBonus: 30});
    expect(getIitcPortalStatistics(portal(), 0, 0).attack)
      .toEqual({forceAmplifier: 0, frequency: 0, hitBonus: 0});
  });

  it.each([
    {owner: 'Me', playerLevel: 8, upgradeCount: 0, friendlyAp: 0},
    {owner: 'Other', playerLevel: 8, upgradeCount: 1, friendlyAp: 65},
    {owner: 'Other', playerLevel: 7, upgradeCount: 0, friendlyAp: 0},
  ])('limits upgrades for an L$playerLevel player with the L8 resonator owned by $owner',
    ({owner, playerLevel, upgradeCount, friendlyAp}) => {
      const input = {...portal(7), resonators: [{level: 8, owner, energy: 500}, ...portal(7).resonators.slice(1)]};
      expect(getIitcPortalApGain(input, 0, 0, {nickname: 'Me', level: playerLevel}))
        .toMatchObject({deployCount: 0, upgradeCount, friendlyAp, enemyAp: 2525});
    });
});
