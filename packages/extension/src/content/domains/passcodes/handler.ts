import { useStore } from '@iris/core';
import type { PasscodeRewards } from '@iris/core';
import { PasscodeResponseData } from './types';

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeRewards(data: PasscodeResponseData['rewards']): PasscodeRewards {
  return {
    xm: toNumber(data?.xm, 0),
    ap: toNumber(data?.ap, 0),
    other: Array.isArray(data?.other) ? data.other.filter((entry): entry is string => typeof entry === 'string') : [],
    inventory: Array.isArray(data?.inventory)
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
}

export function handlePasscodeResponse(data: PasscodeResponseData): void {
  if (typeof data.error === 'string' && data.error.trim()) {
    useStore.getState().setPasscodeRedeemError(data.error);
    return;
  }

  const rewardsCandidate = data.rewards ?? (data as PasscodeResponseData['rewards']);

  if (rewardsCandidate && typeof rewardsCandidate === 'object') {
    useStore.getState().setPasscodeRedeemSuccess(normalizeRewards(rewardsCandidate));
    return;
  }

  useStore.getState().setPasscodeRedeemError('Unexpected passcode response.');
}
