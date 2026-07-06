import type {IitcTeam} from './types';

export type IitcSearchResultType = 'portal' | 'address' | 'coordinate' | 'guid' | 'empty';
export type IitcSearchStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface IitcSearchResult {
  id: string;
  type: IitcSearchResultType;
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  geojson?: unknown;
  guid?: string;
  team?: IitcTeam;
  level?: number;
  health?: number;
  icon?: string;
}

export interface IitcSearchState {
  status: IitcSearchStatus;
  term: string;
  confirmed: boolean;
  results: IitcSearchResult[];
  localResults: number;
  onlineResults?: number;
  elapsedMs?: number;
  error?: string;
}

export interface IitcSearchPortal {
  guid: string;
  title?: string;
  team: IitcTeam;
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  resCount?: number;
  isPlaceholder?: boolean;
}

export interface IitcNominatimResult {
  place_id?: number | string;
  display_name?: string;
  type?: string;
  lat?: string;
  lon?: string;
  icon?: string;
  boundingbox?: [string, string, string, string];
  geojson?: unknown;
}

const DEFAULT_MAX_LOCAL_PORTAL_RESULTS = 20;
const DEFAULT_MAX_NOMINATIM_RESULTS = 10;
const GUID_PATTERN = /[0-9a-f]{32}\.[0-9a-f]{2}/;

export function normalizeIitcSearchTerm(term: string | undefined): string {
  return (term ?? '').trim();
}

function normalizeSearchText(value: string | undefined): string {
  return normalizeIitcSearchTerm(value).toLowerCase();
}

export function describeIitcSearchPortal(portal: IitcSearchPortal): string {
  const team = portal.team === 'R' ? 'RES' : portal.team === 'E' ? 'ENL' : portal.team === 'M' ? 'MAC' : 'NEU';
  const level = portal.level === undefined || portal.isPlaceholder ? 'L-' : `L${portal.level}`;
  const health = portal.health === undefined || portal.isPlaceholder ? '-' : `${Math.round(portal.health)}%`;
  const resonators = portal.resCount === undefined || portal.isPlaceholder ? '-' : `${portal.resCount} Resonators`;
  return `${team}, ${level}, ${health}, ${resonators}`;
}

export function createIitcPortalSearchResult(
  portal: IitcSearchPortal,
  type: Extract<IitcSearchResultType, 'portal' | 'guid'> = 'portal',
): IitcSearchResult {
  return {
    id: `${type}:${portal.guid}`,
    type,
    title: portal.title || portal.guid,
    description: describeIitcSearchPortal(portal),
    lat: portal.latE6 / 1e6,
    lng: portal.lngE6 / 1e6,
    guid: portal.guid,
    team: portal.team,
    level: portal.level,
    health: portal.health,
  };
}

export function getIitcLocalSearchResults(options: {
  term: string;
  portals: IitcSearchPortal[];
  autoMinLength?: number;
  maxPortalResults?: number;
}): IitcSearchResult[] {
  const normalized = normalizeSearchText(options.term);
  const autoMinLength = options.autoMinLength ?? 3;
  if ((normalized.length < autoMinLength && normalized.length > 0) || normalized.length === 0) return [];

  const maxPortalResults = options.maxPortalResults ?? DEFAULT_MAX_LOCAL_PORTAL_RESULTS;
  const results: IitcSearchResult[] = [];
  const guidMatch = normalized.match(GUID_PATTERN);
  if (guidMatch) {
    const portal = options.portals.find((candidate) => candidate.guid.toLowerCase() === guidMatch[0]);
    if (portal) results.push(createIitcPortalSearchResult(portal, 'guid'));
  }

  for (const portal of options.portals) {
    if (!normalizeSearchText(portal.title).includes(normalized)) continue;
    if (results.some((result) => result.guid === portal.guid)) continue;
    results.push(createIitcPortalSearchResult(portal));
    if (results.length >= maxPortalResults) break;
  }

  return results;
}

export function parseIitcSearchCoordinateResults(term: string): IitcSearchResult[] {
  const added = new Set<string>();
  const results: IitcSearchResult[] = [];
  const addResult = (lat: number, lng: number): void => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const title = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (added.has(title)) return;
    added.add(title);
    results.push({id: `coordinate:${title}`, type: 'coordinate', title, description: 'geo coordinates', lat, lng});
  };

  const decimalMatches = term.replace(/%2C/gi, ',').match(/[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g);
  decimalMatches?.forEach((location) => {
    const [lat, lng] = location.split(',').map(Number);
    addResult(lat, lng);
  });

  const dmsRegex = /(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([NS]),?\s*(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([EW])/g;
  for (const match of term.matchAll(dmsRegex)) {
    const parseDms = (deg: string, min: string, sec: string, dir: string): number => {
      const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
      return dir === 'S' || dir === 'W' ? -decimal : decimal;
    };
    addResult(parseDms(match[1], match[2], match[3], match[4]), parseDms(match[5], match[6], match[7], match[8]));
  }

  return results;
}

export function normalizeIitcNominatimResults(
  data: IitcNominatimResult[],
  seen = new Set<string>(),
  maxResults = DEFAULT_MAX_NOMINATIM_RESULTS,
): IitcSearchResult[] {
  const results: IitcSearchResult[] = [];

  for (const item of data) {
    const key = String(item.place_id ?? `${item.lat},${item.lon},${item.display_name}`);
    if (seen.has(key)) continue;
    seen.add(key);
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const result: IitcSearchResult = {
      id: `address:${key}`,
      type: 'address',
      title: item.display_name || `${lat.toFixed(6)},${lng.toFixed(6)}`,
      description: item.type ? `Type: ${item.type}` : 'OpenStreetMap',
      lat,
      lng,
      icon: item.icon,
      geojson: item.geojson,
    };
    if (item.boundingbox) {
      const [south, north, west, east] = item.boundingbox.map(Number);
      result.bounds = {south, west, north, east};
    }
    results.push(result);
    if (results.length >= maxResults) break;
  }

  return results;
}

export function createIitcSearchIdleState(confirmed = false): IitcSearchState {
  return {status: 'idle', term: '', confirmed, results: [], localResults: 0};
}

export function createIitcSearchLocalState(options: {
  term: string;
  confirmed: boolean;
  localResults: IitcSearchResult[];
}): IitcSearchState {
  return {
    status: options.confirmed ? 'loading' : options.localResults.length > 0 ? 'ready' : 'empty',
    term: options.term,
    confirmed: options.confirmed,
    results: options.localResults,
    localResults: options.localResults.length,
  };
}

export function createIitcSearchLoadingState(options: {
  term: string;
  localResults: IitcSearchResult[];
}): IitcSearchState {
  return createIitcSearchLocalState({
    term: options.term,
    confirmed: true,
    localResults: options.localResults,
  });
}

export function createIitcSearchSuccessState(options: {
  term: string;
  confirmed: boolean;
  localResults: IitcSearchResult[];
  onlineResults: IitcSearchResult[];
  elapsedMs: number;
}): IitcSearchState {
  const combined = [...options.localResults, ...options.onlineResults];
  return {
    status: combined.length > 0 ? 'ready' : 'empty',
    term: options.term,
    confirmed: options.confirmed,
    results: combined.length > 0 ? combined : [{id: 'empty:osm', type: 'empty', title: 'No results on OpenStreetMap'}],
    localResults: options.localResults.length,
    onlineResults: options.onlineResults.length,
    elapsedMs: options.elapsedMs,
  };
}

export function createIitcSearchErrorState(options: {
  term: string;
  confirmed: boolean;
  localResults: IitcSearchResult[];
  elapsedMs: number;
  error: string;
}): IitcSearchState {
  return {
    status: options.localResults.length > 0 ? 'ready' : 'error',
    term: options.term,
    confirmed: options.confirmed,
    results: options.localResults,
    localResults: options.localResults.length,
    elapsedMs: options.elapsedMs,
    error: options.error,
  };
}
