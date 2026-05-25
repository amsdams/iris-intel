import type {Plext} from './store';

export type PlayerTrackerPlext = Pick<Plext, 'id' | 'time' | 'text' | 'markup' | 'categories' | 'team'> & {
  type?: Plext['type'];
};

export interface PlayerTrackerAction {
  text: string;
  markup: Plext['markup'];
  time: number;
}

export interface PlayerTrackerEvent {
  latlngs: [number, number][];
  time: number;
  portalName: string;
  actions: PlayerTrackerAction[];
}

export interface PlayerTrackerHistory {
  name: string;
  team: string;
  events: PlayerTrackerEvent[];
}

export interface ProcessPlayerTrackerPlextsOptions {
  plexts: PlayerTrackerPlext[];
  previousHistories?: Map<string, PlayerTrackerHistory>;
  processedPlextFingerprints?: Map<string, string>;
  now?: number;
  expirationMs?: number;
  maxEvents?: number;
}

export interface ProcessPlayerTrackerPlextsResult {
  histories: Map<string, PlayerTrackerHistory>;
  processedPlextFingerprints: Map<string, string>;
  processedCount: number;
  touchedPlayerCount: number;
  maxPlextTime: number | null;
}

export const PLAYER_TRACKER_HISTORY_EXPIRATION_MS = 3 * 60 * 60 * 1000;
export const PLAYER_TRACKER_MAX_DISPLAY_EVENTS = 10;
export const PLAYER_TRACKER_MIN_ZOOM = 9;
export const PLAYER_TRACKER_TICK_MS = 30 * 1000;

export interface PrunePlayerTrackerHistoriesOptions {
  now?: number;
  expirationMs?: number;
}

function getPlextFingerprint(plext: PlayerTrackerPlext): string {
  return JSON.stringify({
    time: plext.time,
    team: plext.team,
    text: plext.text,
    markup: plext.markup,
  });
}

function cloneHistories(histories: Map<string, PlayerTrackerHistory>): Map<string, PlayerTrackerHistory> {
  return new Map(Array.from(histories.entries()).map(([name, history]) => [name, {
    name: history.name,
    team: history.team,
    events: history.events.map((event) => ({
      latlngs: event.latlngs.map(([lat, lng]) => [lat, lng] as [number, number]),
      time: event.time,
      portalName: event.portalName,
      actions: event.actions.map((action) => ({
        text: action.text,
        markup: action.markup,
        time: action.time,
      })),
    })),
  }]));
}

function eventHasLatLng(event: PlayerTrackerEvent, lat: number, lng: number): boolean {
  return event.latlngs.some(([eventLat, eventLng]) => eventLat === lat && eventLng === lng);
}

function addUniqueAction(event: PlayerTrackerEvent, action: PlayerTrackerAction | null): void {
  if (!action) return;
  if (event.actions.some((existing) => existing.text === action.text)) return;
  event.actions.push(action);
}

export function prunePlayerTrackerHistories(
  histories: ReadonlyMap<string, PlayerTrackerHistory>,
  options: PrunePlayerTrackerHistoriesOptions = {},
): Map<string, PlayerTrackerHistory> {
  const now = options.now ?? Date.now();
  const expirationMs = options.expirationMs ?? PLAYER_TRACKER_HISTORY_EXPIRATION_MS;
  const limit = now - expirationMs;
  let changed = false;
  const next = new Map<string, PlayerTrackerHistory>();

  histories.forEach((history, name) => {
    const firstValidIndex = history.events.findIndex((event) => event.time >= limit);
    if (firstValidIndex === -1) {
      changed = true;
      return;
    }

    const events = firstValidIndex > 0 ? history.events.slice(firstValidIndex) : history.events;
    if (events !== history.events) changed = true;
    next.set(name, events === history.events ? history : {...history, events});
  });

  return changed ? next : new Map(histories);
}

function isDestroyOrOwnLinkMessage(text: string): boolean {
  return text.includes('destroyed the Link') ||
    text.includes('destroyed a Control Field') ||
    text.includes('destroyed the') ||
    text.includes('Your Link');
}

function normalizeTrackerTeam(team: string | undefined): string {
  const candidate = team || 'N';
  const upper = candidate.toUpperCase();
  if (upper === 'ENLIGHTENED' || upper === 'E') return 'E';
  if (upper === 'RESISTANCE' || upper === 'R') return 'R';
  if (upper === 'MACHINA' || upper === '__MACHINA__') return 'M';
  if (upper === 'NEUTRAL' || upper === 'N') return 'N';
  return candidate;
}

export function processPlayerTrackerPlexts(options: ProcessPlayerTrackerPlextsOptions): ProcessPlayerTrackerPlextsResult {
  const now = options.now ?? Date.now();
  const expirationMs = options.expirationMs ?? PLAYER_TRACKER_HISTORY_EXPIRATION_MS;
  const maxEvents = options.maxEvents ?? PLAYER_TRACKER_MAX_DISPLAY_EVENTS;
  const limit = now - expirationMs;
  const histories = cloneHistories(options.previousHistories ?? new Map());
  const processedFingerprints = new Map<string, string>(options.processedPlextFingerprints ?? new Map<string, string>());
  const touchedPlayers = new Set<string>();
  let processedCount = 0;
  let maxPlextTime: number | null = null;

  const sorted = [...options.plexts].sort((a, b) => a.time - b.time);

  sorted.forEach((plext) => {
    const fingerprint = getPlextFingerprint(plext);
    if (processedFingerprints.get(plext.id) === fingerprint) return;
    processedFingerprints.set(plext.id, fingerprint);
    if (plext.time < limit) return;

    let playerName: string | null = null;
    let playerTeam = normalizeTrackerTeam(plext.team);
    let lat: number | null = null;
    let lng: number | null = null;
    let portalName = '';
    let skipThis = false;
    const actionParts: string[] = [];
    const actionMarkup: Plext['markup'] = [];

    for (const markup of plext.markup) {
      const [type, data] = markup;
      if (type === 'TEXT') {
        const text = data.plain || '';
        actionParts.push(text);
        actionMarkup.push(markup);
        if (isDestroyOrOwnLinkMessage(text)) {
          skipThis = true;
          break;
        }
      } else if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER' || type === 'FACTION') {
        playerName = data.plain || data.name || playerName;
        if (data.team && data.team !== 'N' && data.team !== 'NEUTRAL') {
          playerTeam = normalizeTrackerTeam(data.team);
        }
        playerTeam = normalizeTrackerTeam(playerName?.toUpperCase() === 'MACHINA' || playerName?.toUpperCase() === '__MACHINA__' ? 'M' : playerTeam);
        actionMarkup.push(markup);
      } else if ((type === 'PORTAL' || type === 'LINK') && lat === null && lng === null) {
        if (typeof data.latE6 === 'number' && typeof data.lngE6 === 'number') {
          lat = data.latE6 / 1e6;
          lng = data.lngE6 / 1e6;
          portalName = data.name || '';
        }
        actionMarkup.push(markup);
      } else {
        actionMarkup.push(markup);
      }
    }

    if (skipThis || !playerName || lat === null || lng === null) return;

    const actionText = actionParts.join('').trim();
    const actionRecord: PlayerTrackerAction | null = actionText
      ? {text: actionText, markup: actionMarkup, time: plext.time}
      : null;

    let history = histories.get(playerName);
    if (!history) {
      history = {name: playerName, team: playerTeam, events: []};
      histories.set(playerName, history);
    } else if (playerTeam && history.team !== playerTeam) {
      history.team = playerTeam;
    }

    touchedPlayers.add(playerName);
    processedCount += 1;
    maxPlextTime = maxPlextTime === null ? plext.time : Math.max(maxPlextTime, plext.time);

    const events = history.events;
    let insertIndex = 0;
    for (insertIndex = 0; insertIndex < events.length; insertIndex += 1) {
      if (events[insertIndex].time > plext.time) break;
    }

    const compareIndex = Math.max(insertIndex - 1, 0);
    const sameTimeEvent = events[compareIndex];
    if (sameTimeEvent && sameTimeEvent.time === plext.time) {
      if (!eventHasLatLng(sameTimeEvent, lat, lng)) {
        sameTimeEvent.latlngs.push([lat, lng]);
      }
      addUniqueAction(sameTimeEvent, actionRecord);
      return;
    }

    const nextEvent = events[compareIndex + 1];
    if (nextEvent && eventHasLatLng(nextEvent, lat, lng)) {
      addUniqueAction(nextEvent, actionRecord);
      return;
    }

    const previousEvent = events[compareIndex];
    if (previousEvent && eventHasLatLng(previousEvent, lat, lng)) {
      previousEvent.time = plext.time;
      addUniqueAction(previousEvent, actionRecord);
    } else {
      events.splice(insertIndex, 0, {
        latlngs: [[lat, lng]],
        time: plext.time,
        portalName,
        actions: actionRecord ? [actionRecord] : [],
      });
    }

    if (history.events.length > maxEvents) {
      history.events.splice(0, history.events.length - maxEvents);
    }
  });

  const prunedHistories = prunePlayerTrackerHistories(histories, {now, expirationMs});

  return {
    histories: prunedHistories,
    processedPlextFingerprints: processedFingerprints,
    processedCount,
    touchedPlayerCount: touchedPlayers.size,
    maxPlextTime,
  };
}
