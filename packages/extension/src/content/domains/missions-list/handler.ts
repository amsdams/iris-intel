import { useStore, MissionParser, TopMissionsInBoundsData } from '@iris/core';

export function handleTopMissionsInBounds(data: TopMissionsInBoundsData): void {
  useStore.getState().setMissionsInView(MissionParser.parseTopMissions(data));
}
