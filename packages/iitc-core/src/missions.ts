export const IITC_MISSION_ORDER = {
  sequential: 1,
  nonSequential: 2,
  hidden: 3,
} as const;

export const IITC_MISSION_WAYPOINT_TARGET = {
  portal: 1,
  fieldTrip: 2,
} as const;

const WAYPOINT_TYPES: Record<number, string> = {
  [IITC_MISSION_WAYPOINT_TARGET.portal]: 'Portal',
  [IITC_MISSION_WAYPOINT_TARGET.fieldTrip]: 'Field Trip',
};

const WAYPOINT_OBJECTIVES: Record<number, string> = {
  1: 'Hack this Portal',
  2: 'Capture or Upgrade Portal',
  3: 'Create Link from Portal',
  4: 'Create Field from Portal',
  5: 'Install a Mod on this Portal',
  6: 'Take a Photo',
  7: 'View this Field Trip Waypoint',
  8: 'Enter the Passphrase',
};

const MISSION_TYPES: Record<number, string> = {
  [IITC_MISSION_ORDER.sequential]: 'Sequential',
  [IITC_MISSION_ORDER.nonSequential]: 'Non-sequential',
  [IITC_MISSION_ORDER.hidden]: 'Hidden',
};

export interface IitcMissionSummary {
  guid: string;
  title: string;
  image?: string;
  ratingE6?: number;
  medianCompletionTimeMs?: number;
}

export interface IitcMissionWaypoint {
  index: number;
  hidden: boolean;
  guid: string;
  title: string;
  typeNum: number;
  type: string;
  objectiveNum: number;
  objective: string;
  latE6?: number;
  lngE6?: number;
  portalGuid?: string;
  portalTitle?: string;
}

export interface IitcMissionDetails extends IitcMissionSummary {
  description: string;
  authorNickname?: string;
  authorTeam?: 'E' | 'R' | 'N' | 'M';
  typeNum?: number;
  type?: string;
  numUniqueCompletedPlayers?: number;
  waypoints: IitcMissionWaypoint[];
  routeLengthMeters?: number;
}

export interface IitcMissionBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

function getResponseResult(response: unknown): unknown {
  return response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value);
}

function asOptionalNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

function asOptionalTeam(value: unknown): 'E' | 'R' | 'N' | 'M' | undefined {
  if (value === 'E' || value === 'R' || value === 'N' || value === 'M') return value;
  if (value === 'ENLIGHTENED') return 'E';
  if (value === 'RESISTANCE') return 'R';
  if (value === 'MACHINA') return 'M';
  return undefined;
}

export function formatIitcMissionDuration(milliseconds?: number): string | undefined {
  if (milliseconds === undefined || milliseconds <= 0) return undefined;
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function decodeIitcMissionSummary(data: unknown): IitcMissionSummary | null {
  const row = asArray(data);
  const guid = asString(row[0]);
  if (!guid) return null;
  return {
    guid,
    title: asString(row[1], 'Mission'),
    image: row[2] ? asString(row[2]) : undefined,
    ratingE6: asOptionalNumber(row[3]),
    medianCompletionTimeMs: asOptionalNumber(row[4]),
  };
}

export function decodeIitcMissionWaypoint(data: unknown, index: number): IitcMissionWaypoint | null {
  const row = asArray(data);
  const guid = asString(row[1], `mission-waypoint-${index}`);
  const typeNum = asOptionalNumber(row[3]) ?? 0;
  const objectiveNum = asOptionalNumber(row[4]) ?? 0;
  const location = asArray(row[5]);
  let latE6: number | undefined;
  let lngE6: number | undefined;
  let portalTitle: string | undefined;

  if (typeNum === IITC_MISSION_WAYPOINT_TARGET.fieldTrip) {
    latE6 = asOptionalNumber(location[1]);
    lngE6 = asOptionalNumber(location[2]);
  } else {
    portalTitle = typeof location[1] === 'string' ? location[1] : undefined;
    latE6 = asOptionalNumber(location[2]);
    lngE6 = asOptionalNumber(location[3]);
  }

  return {
    index,
    hidden: Boolean(row[0]),
    guid,
    title: asString(row[2], `Waypoint ${index + 1}`),
    typeNum,
    type: WAYPOINT_TYPES[typeNum] ?? `Type ${typeNum}`,
    objectiveNum,
    objective: WAYPOINT_OBJECTIVES[objectiveNum] ?? `Objective ${objectiveNum}`,
    latE6,
    lngE6,
    portalGuid: typeNum === IITC_MISSION_WAYPOINT_TARGET.portal ? guid : undefined,
    portalTitle,
  };
}

export function decodeIitcMission(data: unknown): IitcMissionDetails | null {
  const row = asArray(data);
  const guid = asString(row[0]);
  if (!guid) return null;
  const typeNum = asOptionalNumber(row[8]);
  const waypoints = asArray(row[9])
    .map((waypoint, index) => decodeIitcMissionWaypoint(waypoint, index))
    .filter((waypoint): waypoint is IitcMissionWaypoint => waypoint !== null);

  return {
    guid,
    title: asString(row[1], 'Mission'),
    description: asString(row[2]),
    authorNickname: row[3] ? asString(row[3]) : undefined,
    authorTeam: asOptionalTeam(row[4]),
    ratingE6: asOptionalNumber(row[5]),
    medianCompletionTimeMs: asOptionalNumber(row[6]),
    numUniqueCompletedPlayers: asOptionalNumber(row[7]),
    typeNum,
    type: typeNum === undefined ? undefined : MISSION_TYPES[typeNum] ?? `Type ${typeNum}`,
    waypoints,
    routeLengthMeters: getIitcMissionRouteLengthMeters(waypoints),
    image: row[10] ? asString(row[10]) : undefined,
  };
}

function getDistanceMeters(a: IitcMissionWaypoint, b: IitcMissionWaypoint): number {
  if (a.latE6 === undefined || a.lngE6 === undefined || b.latE6 === undefined || b.lngE6 === undefined) return 0;
  const radiusMeters = 6371000;
  const lat1 = (a.latE6 / 1_000_000) * Math.PI / 180;
  const lat2 = (b.latE6 / 1_000_000) * Math.PI / 180;
  const deltaLat = ((b.latE6 - a.latE6) / 1_000_000) * Math.PI / 180;
  const deltaLng = ((b.lngE6 - a.lngE6) / 1_000_000) * Math.PI / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getIitcMissionRouteLengthMeters(waypoints: IitcMissionWaypoint[]): number | undefined {
  const routeWaypoints = waypoints.filter((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined);
  if (routeWaypoints.length < 2) return undefined;
  const meters = routeWaypoints.reduce((sum, waypoint, index) => {
    if (index === 0) return 0;
    return sum + getDistanceMeters(routeWaypoints[index - 1], waypoint);
  }, 0);
  return meters > 0 ? meters : undefined;
}

export function parseIitcTopMissionsResponse(response: unknown): IitcMissionSummary[] {
  return asArray(getResponseResult(response))
    .map(decodeIitcMissionSummary)
    .filter((mission): mission is IitcMissionSummary => mission !== null);
}

export function parseIitcMissionDetailsResponse(response: unknown): IitcMissionDetails | null {
  return decodeIitcMission(getResponseResult(response));
}

export function getIitcMissionBounds(mission: IitcMissionDetails): IitcMissionBounds | null {
  const points = mission.waypoints
    .flatMap((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined
      ? [{lat: waypoint.latE6 / 1_000_000, lng: waypoint.lngE6 / 1_000_000}]
      : []);
  if (points.length === 0) return null;
  return {
    south: Math.min(...points.map((point) => point.lat)),
    west: Math.min(...points.map((point) => point.lng)),
    north: Math.max(...points.map((point) => point.lat)),
    east: Math.max(...points.map((point) => point.lng)),
  };
}
