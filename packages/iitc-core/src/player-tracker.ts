import {type IitcCommMessage, type IitcCommMarkupValue, type IitcTeamId, teamStringToId} from './comm';

export const IITC_PLAYER_TRACKER_MAX_TIME = 3 * 60 * 60 * 1000;
export const IITC_PLAYER_TRACKER_MIN_ZOOM = 9;
export const IITC_PLAYER_TRACKER_MIN_OPACITY = 0.3;
export const IITC_PLAYER_TRACKER_LINE_COLOR = '#FF00FD';
export const IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS = 10;

export interface IitcPlayerTrackerAction {
  text: string;
  markup: [string, IitcCommMarkupValue][];
  time: number;
}

export interface IitcPlayerTrackerEvent {
  latlngs: [number, number][];
  time: number;
  name?: string;
  address?: string;
  actions: IitcPlayerTrackerAction[];
}

export interface IitcPlayerTrackerPlayer {
  team: IitcTeamId;
  events: IitcPlayerTrackerEvent[];
}

export type IitcPlayerTrackerStored = Record<string, IitcPlayerTrackerPlayer>;

export interface IitcPlayerTrackerProcessResult {
  stored: IitcPlayerTrackerStored;
  processedMessages: number;
  touchedPlayers: string[];
  maxMessageTime: number | null;
}

export interface IitcPlayerTrackerDiagnostics {
  enabled: boolean;
  visible: boolean;
  players: number;
  events: number;
  markers: number;
  traces: number;
  latestCommTime: number | null;
  minZoom: number;
  maxAgeMs: number;
}

function cloneStored(stored: IitcPlayerTrackerStored): IitcPlayerTrackerStored {
  return Object.fromEntries(Object.entries(stored).map(([name, player]) => [name, {
    team: player.team,
    events: player.events.map((event) => ({
      latlngs: event.latlngs.map(([lat, lng]) => [lat, lng] as [number, number]),
      time: event.time,
      name: event.name,
      address: event.address,
      actions: event.actions.map((action) => ({
        text: action.text,
        markup: action.markup.map(([type, value]) => [type, {...value}] as [string, IitcCommMarkupValue]),
        time: action.time,
      })),
    })),
  }]));
}

function eventHasLatLng(event: IitcPlayerTrackerEvent, lat: number, lng: number): boolean {
  return event.latlngs.some(([eventLat, eventLng]) => eventLat === lat && eventLng === lng);
}

function isTrackedPlayerTeam(team: IitcTeamId): boolean {
  return team === 'R' || team === 'E' || team === 'M';
}

function isDestroyOrOwnLinkMessage(text: string): boolean {
  return text.includes('destroyed the Link') ||
    text.includes('destroyed a Control Field') ||
    text.includes('destroyed the') ||
    text.includes('Your Link');
}

function addUniqueAction(event: IitcPlayerTrackerEvent, action: IitcPlayerTrackerAction): void {
  if (event.actions.some((existing) => existing.text === action.text && existing.time === action.time)) return;
  event.actions.push(action);
}

export function getIitcPlayerTrackerLimit(now = Date.now(), maxAgeMs = IITC_PLAYER_TRACKER_MAX_TIME): number {
  return now - maxAgeMs;
}

export function pruneIitcPlayerTrackerStored(
  stored: IitcPlayerTrackerStored,
  now = Date.now(),
  maxAgeMs = IITC_PLAYER_TRACKER_MAX_TIME,
): IitcPlayerTrackerStored {
  const limit = getIitcPlayerTrackerLimit(now, maxAgeMs);
  const next: IitcPlayerTrackerStored = {};

  for (const [playerName, player] of Object.entries(stored)) {
    const firstValidIndex = player.events.findIndex((event) => event.time >= limit);
    if (firstValidIndex === -1) continue;
    next[playerName] = {
      team: player.team,
      events: player.events.slice(firstValidIndex),
    };
  }

  return next;
}

export function getIitcPlayerTrackerLatLng(event: IitcPlayerTrackerEvent): [number, number] {
  const total = event.latlngs.reduce((sum, latlng) => ({
    lat: sum.lat + latlng[0],
    lng: sum.lng + latlng[1],
  }), {lat: 0, lng: 0});
  return [total.lat / event.latlngs.length, total.lng / event.latlngs.length];
}

export function processIitcPlayerTrackerData(
  messages: IitcCommMessage[],
  previousStored: IitcPlayerTrackerStored = {},
  now = Date.now(),
  maxAgeMs = IITC_PLAYER_TRACKER_MAX_TIME,
): IitcPlayerTrackerProcessResult {
  const limit = getIitcPlayerTrackerLimit(now, maxAgeMs);
  const stored = cloneStored(previousStored);
  const touched = new Set<string>();
  let processedMessages = 0;
  let maxMessageTime: number | null = null;

  [...messages].sort((a, b) => a.time - b.time).forEach((message) => {
    if (message.time < limit) return;

    let playerName = '';
    let playerTeam: IitcTeamId = message.player.team || teamStringToId(message.team);
    let lat: number | null = null;
    let lng: number | null = null;
    let name: string | undefined;
    let address: string | undefined;
    let skipThisMessage = false;

    for (const [type, value] of message.markup) {
      if (type === 'TEXT') {
        const text = value.plain ?? '';
        if (isDestroyOrOwnLinkMessage(text)) {
          skipThisMessage = true;
          break;
        }
      } else if (type === 'PLAYER' || type === 'SENDER') {
        playerName = value.plain?.replace(/: $/, '') || playerName;
        const team = teamStringToId(value.team);
        if (team !== 'N') playerTeam = team;
      } else if (type === 'PORTAL' && lat === null && lng === null) {
        if (typeof value.latE6 === 'number' && typeof value.lngE6 === 'number') {
          lat = value.latE6 / 1e6;
          lng = value.lngE6 / 1e6;
          name = value.name;
          address = value.address;
        }
      }
    }

    if (!playerName || lat === null || lng === null || skipThisMessage || !isTrackedPlayerTeam(playerTeam)) return;

    const action: IitcPlayerTrackerAction = {
      text: message.text,
      markup: message.markup.map(([type, value]) => [type, {...value}]),
      time: message.time,
    };
    const newEvent: IitcPlayerTrackerEvent = {
      latlngs: [[lat, lng]],
      time: message.time,
      name,
      address,
      actions: action.text ? [action] : [],
    };

    const playerData = stored[playerName];
    if (!playerData || playerData.events.length === 0) {
      stored[playerName] = {team: playerTeam, events: [newEvent]};
      touched.add(playerName);
      processedMessages += 1;
      maxMessageTime = maxMessageTime === null ? message.time : Math.max(maxMessageTime, message.time);
      return;
    }

    playerData.team = playerTeam;
    const events = playerData.events;
    let insertIndex = 0;
    for (insertIndex = 0; insertIndex < events.length; insertIndex += 1) {
      if (events[insertIndex].time > message.time) break;
    }

    const compareIndex = Math.max(insertIndex - 1, 0);
    if (events[compareIndex]?.time === message.time) {
      if (!eventHasLatLng(events[compareIndex], lat, lng)) events[compareIndex].latlngs.push([lat, lng]);
      addUniqueAction(events[compareIndex], action);
    } else if (events[compareIndex + 1] && eventHasLatLng(events[compareIndex + 1], lat, lng)) {
      addUniqueAction(events[compareIndex + 1], action);
    } else if (events[compareIndex] && eventHasLatLng(events[compareIndex], lat, lng)) {
      events[compareIndex].time = message.time;
      addUniqueAction(events[compareIndex], action);
    } else {
      events.splice(insertIndex, 0, newEvent);
    }

    touched.add(playerName);
    processedMessages += 1;
    maxMessageTime = maxMessageTime === null ? message.time : Math.max(maxMessageTime, message.time);
  });

  return {
    stored: pruneIitcPlayerTrackerStored(stored, now, maxAgeMs),
    processedMessages,
    touchedPlayers: [...touched],
    maxMessageTime,
  };
}

export function getIitcPlayerTrackerDiagnostics(
  stored: IitcPlayerTrackerStored,
  options: Partial<IitcPlayerTrackerDiagnostics> = {},
): IitcPlayerTrackerDiagnostics {
  const players = Object.values(stored);
  const events = players.reduce((sum, player) => sum + player.events.length, 0);
  return {
    enabled: options.enabled ?? false,
    visible: options.visible ?? false,
    players: players.length,
    events,
    markers: options.markers ?? 0,
    traces: options.traces ?? 0,
    latestCommTime: options.latestCommTime ?? null,
    minZoom: options.minZoom ?? IITC_PLAYER_TRACKER_MIN_ZOOM,
    maxAgeMs: options.maxAgeMs ?? IITC_PLAYER_TRACKER_MAX_TIME,
  };
}
