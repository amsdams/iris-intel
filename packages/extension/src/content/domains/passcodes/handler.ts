import { useStore } from '@iris/core';
import type { PasscodeRewards } from '@iris/core';
import { PasscodeResponseData } from './types';

function normalizeRewards(data: PasscodeResponseData['rewards']): PasscodeRewards {
  return {
    xm: typeof data?.xm === 'number' ? data.xm : 0,
    ap: typeof data?.ap === 'number' ? data.ap : 0,
    other: Array.isArray(data?.other) ? data.other.filter((entry): entry is string => typeof entry === 'string') : [],
    inventory: Array.isArray(data?.inventory)
      ? data.inventory
          .filter((item): item is NonNullable<typeof item> => !!item && typeof item === 'object')
          .map((item) => ({
            name: typeof item.name === 'string' ? item.name : 'Unknown item',
            awards: Array.isArray(item.awards)
              ? item.awards.map((award) => ({
                  level: typeof award.level === 'number' ? award.level : 0,
                  count: typeof award.count === 'number' ? award.count : 1,
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
