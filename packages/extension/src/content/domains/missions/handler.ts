import { useStore } from '@iris/core';
import { MissionDetailsData } from './types';
import { parseMissionDetails } from './parser';

export function handleMissionDetails(data: MissionDetailsData): void {
  const mission = parseMissionDetails(data);
  if (!mission) return;

  useStore.getState().setMissionDetails(mission);

  const firstWaypointWithCoords = mission.waypoints.find(
    (waypoint) => waypoint.lat !== undefined && waypoint.lng !== undefined,
  );

  if (firstWaypointWithCoords?.lat !== undefined && firstWaypointWithCoords.lng !== undefined) {
    const { zoom } = useStore.getState().mapState;
    useStore.getState().updateMapState(firstWaypointWithCoords.lat, firstWaypointWithCoords.lng, Math.max(zoom, 15));
  }
}
