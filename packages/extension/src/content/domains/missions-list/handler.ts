import { useStore } from '@iris/core';
import { TopMissionsInBoundsData } from './types';
import { parseTopMissionsInBounds } from './parser';

export function handleTopMissionsInBounds(data: TopMissionsInBoundsData): void {
  useStore.getState().setMissionsInView(parseTopMissionsInBounds(data));
}
