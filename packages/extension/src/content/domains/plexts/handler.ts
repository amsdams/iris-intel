import { useStore } from '@iris/core';
import { PlextData } from './types';
import { parsePlexts } from './parser';

export function handlePlexts(data: PlextData, setLastPlextRequestTime: (time: number) => void): void {
  setLastPlextRequestTime(Date.now());
  const plexts = parsePlexts(data);
  if (plexts.length > 0) {
    useStore.getState().updatePlexts(plexts);
  }
}
