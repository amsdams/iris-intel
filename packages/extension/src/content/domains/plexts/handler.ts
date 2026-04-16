import { useStore, PlextParser, PlextData } from '@iris/core';

export function handlePlexts(data: PlextData, setLastPlextRequestTime: (time: number) => void): void {
  setLastPlextRequestTime(Date.now());
  const plexts = PlextParser.parse(data);
  if (plexts.length > 0) {
    useStore.getState().updatePlexts(plexts);
  }
}
