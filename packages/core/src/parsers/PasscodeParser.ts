import { PasscodeRewards } from '../store';
import { PasscodeResponseData, IntelPasscodeRewardsData } from './intel-types';

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export const PasscodeParser = {
  parseRewards: (data: IntelPasscodeRewardsData): PasscodeRewards => {
    return {
      xm: toNumber(data.xm, 0),
      ap: toNumber(data.ap, 0),
      other: Array.isArray(data.other) ? data.other.filter((entry): entry is string => typeof entry === 'string') : [],
      inventory: Array.isArray(data.inventory)
        ? data.inventory
            .filter((item): item is NonNullable<typeof item> => !!item && typeof item === 'object')
            .map((item) => ({
              name: typeof item.name === 'string' ? item.name : 'Unknown item',
              awards: Array.isArray(item.awards)
                ? item.awards.map((award) => ({
                    level: toNumber(award.level, 0),
                    count: toNumber(award.count, 1),
                  }))
                : [],
            }))
        : [],
    };
  },

  parseResponse: (data: PasscodeResponseData): { error?: string; rewards?: PasscodeRewards } => {
    if (typeof data.error === 'string' && data.error.trim()) {
      return { error: data.error };
    }

    const rewardsCandidate = data.rewards ?? (data as IntelPasscodeRewardsData);

    if (rewardsCandidate && typeof rewardsCandidate === 'object') {
      return { rewards: PasscodeParser.parseRewards(rewardsCandidate) };
    }

    return { error: 'Unexpected passcode response.' };
  }
};
