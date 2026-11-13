import type {IitcPortalMod, IitcPortalResonator} from './portal-details';
import type {IitcTeam} from './types';

export interface IitcPortalStatisticsInput {
  team: IitcTeam;
  level?: number;
  resCount?: number;
  mods: readonly IitcPortalMod[];
  resonators: readonly IitcPortalResonator[];
}
export interface IitcPortalPlayer {nickname?: string; level?: number; team?: IitcTeam}
export interface IitcPortalStatistics {
  range: ReturnType<typeof getIitcPortalRange>;
  currentEnergy: number;
  totalEnergy: number;
  maxOutgoingLinks: number;
  friendly?: boolean;
  ap: ReturnType<typeof getIitcPortalApGain>;
  hacks: {count: number; cooldown?: number; burnout?: number; friendlyCooldown: number; enemyCooldown: number};
  attack: {forceAmplifier: number; frequency: number; hitBonus: number};
}

const ENERGY = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000];
const MAC_RANGE = [0, 200, 250, 350, 400, 500, 600, 700, 1000, 1000];
const RESONATORS_PER_PLAYER = [0, 8, 4, 4, 4, 2, 2, 1, 1];
const AMP_SCALE = [1, 0.25, 0.125, 0.125];

function modValues(mods: readonly IitcPortalMod[], stat: string): number[] {
  return mods.map(mod => Number(mod.stats[stat])).filter(Number.isFinite).sort((a, b) => b - a);
}

export function getIitcPortalRange(portal: IitcPortalStatisticsInput): {
  base: number; boost: number; range: number; isLinkable: boolean;
} {
  const level = portal.resonators.reduce((sum, reso) => sum + reso.level, 0) / 8;
  const amps = modValues(portal.mods, 'LINK_RANGE_MULTIPLIER');
  const base = portal.team === 'M' ? MAC_RANGE[(portal.level ?? 0) + 1] ?? 0 : 160 * level ** 4;
  const boost = portal.team === 'M' || !amps.length ? 1
    : amps.reduce((sum, value, index) => sum + value / 1000 * (AMP_SCALE[index] ?? 0), 0);
  return {base, boost, range: base * boost, isLinkable: portal.resCount === 8};
}

export function getIitcPortalApGain(portal: IitcPortalStatisticsInput, linkCount: number, fieldCount: number,
  player: IitcPortalPlayer = {}): {
    friendlyAp?: number; deployCount: number; upgradeCount?: number; enemyAp: number;
    destroyAp: number; resoAp: number; linkAp: number; fieldAp: number; captureAp: number;
  } {
  const resoAp = portal.resonators.length * 75;
  const linkAp = linkCount * 187;
  const fieldAp = fieldCount * 750;
  const destroyAp = resoAp + linkAp + fieldAp;
  const captureAp = 675 + 8 * 125 + 250;
  const deployCount = 8 - portal.resonators.length;
  let friendlyAp: number | undefined;
  let upgradeCount: number | undefined;
  if (player.level !== undefined && player.nickname) {
    const available = RESONATORS_PER_PLAYER.map((count, level) => level > (player.level ?? 0) ? 0 : count);
    const others = Array<number>(9).fill(0);
    for (const reso of portal.resonators) {
      if (reso.owner === player.nickname) available[reso.level] = Math.max(0, available[reso.level] - 1);
      else others[reso.level] += 1;
    }
    upgradeCount = 0;
    let higherAvailable = available[8];
    for (let level = 7; level >= 0; level--) {
      upgradeCount = Math.min(upgradeCount + others[level], higherAvailable);
      higherAvailable += available[level];
    }
    friendlyAp = deployCount * 125 + upgradeCount * 65 + (deployCount > 0 ? 250 : 0);
  }
  return {friendlyAp, deployCount, upgradeCount, enemyAp: destroyAp + captureAp,
    destroyAp, resoAp, linkAp, fieldAp, captureAp};
}

export function getIitcPortalStatistics(portal: IitcPortalStatisticsInput, linkCount: number, fieldCount: number,
  player: IitcPortalPlayer = {}): IitcPortalStatistics {
  const friendly = player.team === undefined ? undefined : portal.team === player.team;
  const hackCooldown = (base: number): number => modValues(portal.mods, 'HACK_SPEED')
    .reduce((time, speed, index) => Math.round(time * (1 - speed / 1000000 * (index === 0 ? 1 : 0.5))), base);
  const hacks = modValues(portal.mods, 'BURNOUT_INSULATION')
    .reduce((count, extra, index) => count + extra * (index === 0 ? 1 : 0.5), 4);
  const cooldown = friendly === undefined ? undefined : hackCooldown(friendly ? 180 : 300);
  const scaledAttack = (stat: string): number => modValues(portal.mods, stat)
    .reduce((sum, value, index) => sum + value / 1000 * (AMP_SCALE[index] ?? 0), 0);
  const turrets = portal.mods.filter(mod => mod.stats.HIT_BONUS !== undefined)
    .slice().sort((a, b) => Number(b.stats.HIT_BONUS) - Number(a.stats.HIT_BONUS));
  return {
    friendly,
    range: getIitcPortalRange(portal),
    currentEnergy: portal.resonators.reduce((sum, reso) => sum + reso.energy, 0),
    totalEnergy: portal.resonators.reduce((sum, reso) => sum + (ENERGY[reso.level] ?? 0), 0),
    maxOutgoingLinks: 8 + modValues(portal.mods, 'OUTGOING_LINKS_BONUS').reduce((sum, extra) => sum + extra, 0),
    ap: getIitcPortalApGain(portal, linkCount, fieldCount, player),
    hacks: {count: hacks, cooldown, burnout: cooldown === undefined ? undefined : cooldown * (hacks - 1),
      friendlyCooldown: hackCooldown(180), enemyCooldown: hackCooldown(300)},
    attack: {forceAmplifier: scaledAttack('FORCE_AMPLIFIER'), frequency: turrets.reduce((sum, mod, index) =>
      sum + (Number(mod.stats.ATTACK_FREQUENCY) || 0) / 1000 * (AMP_SCALE[index] ?? 0), 0),
      hitBonus: modValues(portal.mods, 'HIT_BONUS').reduce((sum, bonus) => sum + bonus / 10000, 0)},
  };
}
