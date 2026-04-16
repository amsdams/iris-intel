import { MissionSummary, MissionDetails, MissionWaypoint } from '../store';
import { TopMissionsInBoundsData, MissionDetailsData, MissionWaypointPayload } from './intel-types';

function formatMissionDuration(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  const totalSeconds = Math.round(Number(raw) / 1000);
  if (Number.isNaN(totalSeconds) || totalSeconds <= 0) return undefined;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function parseMissionWaypoint(rawWaypoint: MissionWaypointPayload, index: number): MissionWaypoint {
  const hidden = Boolean(rawWaypoint[0]);
  const id = String(rawWaypoint[1] ?? `mission-waypoint-${index}`);
  const title = String(rawWaypoint[2] ?? `Waypoint ${index + 1}`);
  const type = Number(rawWaypoint[3] ?? 0);
  const objective = Number(rawWaypoint[4] ?? 0);
  const locationPayload = rawWaypoint[5];

  let lat: number | undefined;
  let lng: number | undefined;

  if (Array.isArray(locationPayload)) {
    if (type === 2) {
      const latE6 = Number(locationPayload[1]);
      const lngE6 = Number(locationPayload[2]);
      if (!Number.isNaN(latE6) && !Number.isNaN(lngE6)) {
        lat = latE6 / 1e6;
        lng = lngE6 / 1e6;
      }
    } else {
      const latE6 = Number(locationPayload[2]);
      const lngE6 = Number(locationPayload[3]);
      if (!Number.isNaN(latE6) && !Number.isNaN(lngE6)) {
        lat = latE6 / 1e6;
        lng = lngE6 / 1e6;
      }
    }
  }

  return {
    index,
    id,
    title,
    type,
    objective,
    hidden,
    lat,
    lng,
  };
}

export const MissionParser = {
  parseTopMissions: (data: TopMissionsInBoundsData): MissionSummary[] => {
    if (!Array.isArray(data.result)) return [];

    return data.result.map((missionRow) => ({
      id: String(missionRow[0] ?? ''),
      title: String(missionRow[1] ?? 'Mission'),
      logoUrl: missionRow[2] ? String(missionRow[2]) : undefined,
      rating: missionRow[3] !== undefined ? Number(missionRow[3]) / 1e6 : undefined,
      medianCompletionTime: formatMissionDuration(missionRow[4]),
    })).filter((mission) => mission.id.length > 0);
  },

  parseDetails: (data: MissionDetailsData): MissionDetails | null => {
    if (!Array.isArray(data.result)) return null;

    const mission = data.result;
    const waypointsRaw = Array.isArray(mission[9]) ? mission[9] as MissionWaypointPayload[] : [];
    const waypoints = waypointsRaw.map((waypoint, index) => parseMissionWaypoint(waypoint, index));

    return {
      id: String(mission[0] ?? ''),
      title: String(mission[1] ?? 'Mission'),
      description: String(mission[2] ?? ''),
      author: mission[3] ? String(mission[3]) : undefined,
      rating: mission[5] !== undefined ? Number(mission[5]) / 1e6 : undefined,
      medianCompletionTime: formatMissionDuration(mission[6]),
      participants: mission[7] !== undefined ? Number(mission[7]) : undefined,
      logoUrl: mission[10] ? String(mission[10]) : undefined,
      waypoints,
    };
  }
};
