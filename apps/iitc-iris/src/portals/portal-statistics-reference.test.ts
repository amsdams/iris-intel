import {describe, expect, it} from 'vitest';
import {runInNewContext} from 'node:vm';
import referenceSource from '../../../../reference/ingress-intel-total-conversion/core/code/portal.js?raw';
import {getIitcPortalStatistics, type IitcPortalStatisticsInput, type IitcPortalStatistics} from '@iris/iitc-core';

interface Reference {
  getRange: (portal: IitcPortalStatisticsInput) => IitcPortalStatistics['range'];
  getCurrentEnergy: (portal: IitcPortalStatisticsInput) => number;
  getTotalEnergy: (portal: IitcPortalStatisticsInput) => number;
  getMaxOutgoingLinks: (portal: IitcPortalStatisticsInput) => number;
  getHackDetails: (portal: IitcPortalStatisticsInput) => {cooldown: number; hacks: number; burnout: number};
  getAttackApGain: (portal: IitcPortalStatisticsInput, fieldCount: number, linkCount: number) => IitcPortalStatistics['ap'];
  getAttackValues: (portal: IitcPortalStatisticsInput) => {hit_bonus: number; force_amplifier: number; attack_frequency: number};
}

describe('portal statistics against checked-in IITC', () => {
  it('matches the original formulas for factions, resonator/player levels and stacked mods', () => {
    const player = {team: 'R' as const, nickname: 'Me', level: 8};
    const iitc = {portal: undefined as Reference | undefined, registerLegacyAliases: (): void => { /* No globals needed. */ }};
    runInNewContext(referenceSource, {IITC: iitc, window: {
      PLAYER: player, teamStringToId: (team: string): string => team, TEAM_MAC: 'M',
      LINK_RANGE_MAC: [0, 200, 250, 350, 400, 500, 600, 700, 1000, 1000],
      RESO_NRG: [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000], MAX_RESO_PER_PLAYER: [0, 8, 4, 4, 4, 2, 2, 1, 1],
      DESTROY_RESONATOR: 75, DESTROY_LINK: 187, DESTROY_FIELD: 750, CAPTURE_PORTAL: 675,
      DEPLOY_RESONATOR: 125, COMPLETION_BONUS: 250, UPGRADE_ANOTHERS_RESONATOR: 65,
      FACTION_HACK_COOLDOWN: 180, BASE_HACK_COOLDOWN: 300, BASE_HACK_COUNT: 4,
    }});
    const ref = iitc.portal;
    if (!ref) throw new Error('Reference did not initialize');
    for (const team of ['E', 'R', 'M', 'N'] as const) for (const level of [1, 4, 8]) for (const count of [0, 4, 8]) {
      player.level = level;
      const portal: IitcPortalStatisticsInput = {team, level, resCount: count,
        resonators: Array.from({length: count}, (_, index) => ({level: index % 8 + 1,
          owner: index % 2 ? 'Me' : 'Other', energy: 100})),
        mods: [
          {name: '', owner: '', rarity: '', stats: {LINK_RANGE_MULTIPLIER: 2000, HACK_SPEED: 500000, BURNOUT_INSULATION: 12}},
          {name: '', owner: '', rarity: '', stats: {LINK_RANGE_MULTIPLIER: 7000, HACK_SPEED: 200000, BURNOUT_INSULATION: 8}},
          {name: '', owner: '', rarity: '', stats: {OUTGOING_LINKS_BONUS: 8, FORCE_AMPLIFIER: 2000, HIT_BONUS: 300000, ATTACK_FREQUENCY: 2000}},
          {name: '', owner: '', rarity: '', stats: {HIT_BONUS: 200000, ATTACK_FREQUENCY: 3000}},
        ]};
      const actual = getIitcPortalStatistics(portal, 3, 2, player);
      expect(actual.range).toEqual(ref.getRange(portal));
      expect(actual.currentEnergy).toBe(ref.getCurrentEnergy(portal));
      expect(actual.totalEnergy).toBe(ref.getTotalEnergy(portal));
      expect(actual.maxOutgoingLinks).toBe(ref.getMaxOutgoingLinks(portal));
      const hack = ref.getHackDetails(portal);
      expect(actual.hacks).toMatchObject({cooldown: hack.cooldown, count: hack.hacks, burnout: hack.burnout});
      expect(actual.ap).toMatchObject(ref.getAttackApGain(portal, 2, 3));
      const attack = ref.getAttackValues(portal);
      expect(actual.attack).toEqual({forceAmplifier: attack.force_amplifier, frequency: attack.attack_frequency, hitBonus: attack.hit_bonus});
    }
  });
});
