import { MissionSummary } from '@iris/core';
import { TopMissionsInBoundsData } from './types';

function formatMissionDuration(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  const totalSeconds = Math.round(Number(raw) / 1000);
  if (Number.isNaN(totalSeconds) || totalSeconds <= 0) return undefined;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function parseTopMissionsInBounds(data: TopMissionsInBoundsData): MissionSummary[] {
  if (!Array.isArray(data.result)) return [];

  return data.result.map((missionRow) => ({
    id: String(missionRow[0] ?? ''),
    title: String(missionRow[1] ?? 'Mission'),
    logoUrl: missionRow[2] ? String(missionRow[2]) : undefined,
    rating: missionRow[3] !== undefined ? Number(missionRow[3]) / 1e6 : undefined,
    medianCompletionTime: formatMissionDuration(missionRow[4]),
  })).filter((mission) => mission.id.length > 0);
}
