import { IRISPlugin, IRIS_API, Plext } from '@iris/plugin-sdk';

interface PlayerAction {
  text: string;
  markup: Plext['markup'];
}

interface PlayerEvent {
  latlngs: [number, number][]; // Handle multiple coords at same timestamp (resos)
  time: number;
  portalName: string;
  actions: PlayerAction[];
}

interface PlayerHistory {
  team: string;
  color: string;
  events: PlayerEvent[];
}

interface PlayerTrackerApi extends IRIS_API {
  _playerTrackerUnsub?: () => void;
  _playerTrackerTicker?: ReturnType<typeof setInterval>;
}

const EXPIRATION_MS = 3 * 60 * 60 * 1000; // 3 hours (IITC default)
const TICK_MS = 30 * 1000; // 30 seconds update
const MAX_DISPLAY_EVENTS = 10; // Max events to show in trace

const PlayerTrackerPlugin: IRISPlugin = {
  manifest: {
    id: 'player-tracker',
    name: 'Player Tracker',
    version: '2.0.0',
    description: 'Visualizes player movement paths from COMM messages.',
    author: 'IRIS Team (DanielOnDiordna inspired)',
  },
  setup: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    const playerHistories = new Map<string, PlayerHistory>();
    const processedPlextIds = new Set<string>();

    // Helper to get average LatLng for an event
    const getLatLngFromEvent = (event: PlayerEvent): [number, number] => {
        let lats = 0;
        let lngs = 0;
        event.latlngs.forEach(([lat, lng]) => {
            lats += lat;
            lngs += lng;
        });
        return [lats / event.latlngs.length, lngs / event.latlngs.length];
    };

    // Helper to check if event has a specific LatLng
    const eventHasLatLng = (event: PlayerEvent, lat: number, lng: number): boolean =>
        event.latlngs.some(([eLat, eLng]) => eLat === lat && eLng === lng);

    // Player-specific random color based on name hash (IITC style)
    const getPlayerColor = (name: string, team: string): string => {
        const colors = api.ui.getThemeColors();
        const teamKey = api.utils.normalizeTeam(team);
        console.log("player team", team, "teamKey", teamKey)
        return (colors as any)[teamKey] || '#ffffff';
    };

    // Faction color helper
    const getFactionColor = (team: string): string => {

        const colors = api.ui.getThemeColors();
        const teamKey = api.utils.normalizeTeam(team);
        console.log("faction team", team, "teamKey", teamKey)
        return (colors as any)[teamKey] || '#ffffff';
    };

    // Time ago helper (IITC style)
    const formatAgo = (time: number, now: number): string => {
        const s = (now - time) / 1000;
        const m = Math.floor((s % 3600) / 60);
        const h = Math.floor(s / 3600);
        const d = Math.floor(h / 24);
        
        if (d > 0) return `${d}d${h % 24}h${m}m`;
        if (h > 0) return `${h}h${m}m`;
        return `${m}m`;
    };

    const discardOldData = (): void => {
        const limit = Date.now() - EXPIRATION_MS;
        playerHistories.forEach((history, playerName) => {
            const firstValidIndex = history.events.findIndex((e) => e.time >= limit);
            if (firstValidIndex === -1) {
                playerHistories.delete(playerName);
            } else if (firstValidIndex > 0) {
                history.events.splice(0, firstValidIndex);
            }
        });
    };

    const updateMap = (): void => {
        const now = Date.now();
        discardOldData();

        const finalFeatures: GeoJSON.Feature[] = [];

        playerHistories.forEach((history, name) => {
            if (history.events.length === 0) return;

            const events = history.events;
            const evtsLength = events.length;
            
            // 1. Draw Traces (Lines)
            // Show up to MAX_DISPLAY_EVENTS segments
            const startIndex = Math.max(0, evtsLength - MAX_DISPLAY_EVENTS);
            for (let i = evtsLength - 1; i > startIndex; i -= 1) {
                const curr = events[i];
                const prev = events[i-1];
                
                const currPos = getLatLngFromEvent(curr);
                const prevPos = getLatLngFromEvent(prev);
                
                // Don't draw line if same location (should be handled by logic, but safety check)
                if (currPos[0] === prevPos[0] && currPos[1] === prevPos[1]) continue;

                const ageBucket = Math.floor((now - curr.time) / (EXPIRATION_MS / 4));
                const opacity = Math.max(0.1, 1 - 0.2 * ageBucket);
                const weight = Math.max(0.5, 2 - 0.25 * ageBucket);

                finalFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[prevPos[1], prevPos[0]], [currPos[1], currPos[0]]],
                    },
                    properties: {
                        id: `pt-line:${name}:${curr.time}`,
                        color: history.color,
                        opacity,
                        weight, // Used by some renderers, IRIS uses opacity mostly
                    },
                });
            }

            // 2. Draw Player Marker (Point)
            const lastEvent = events[evtsLength - 1];
            const lastPos = getLatLngFromEvent(lastEvent);
            const agoText = formatAgo(lastEvent.time, now);

            finalFeatures.push({
                type: 'Feature',
                id: `player:${name}`,
                geometry: {
                    type: 'Point',
                    coordinates: [lastPos[1], lastPos[0]],
                },
                properties: {
                    id: `player:${name}`,
                    name,
                    team: history.team,
                    color: getFactionColor(history.team),
                    isPlayerMarker: true,
                    label: `${name}, ${agoText}`,
                    time: lastEvent.time,
                    portalName: lastEvent.portalName,
                    actions: lastEvent.actions, // Pass actions array
                },
            });
        });

        api.map.setFeatures(finalFeatures);
    };

    const unsubscribe = api.plexts.subscribe((plexts: Plext[]) => {
      // Sort oldest to newest for consistent history building
      const sorted = [...plexts].sort((a, b) => a.time - b.time);

      sorted.forEach((p) => {
        if (processedPlextIds.has(p.id)) return;
        processedPlextIds.add(p.id);
        
        if (p.time < Date.now() - EXPIRATION_MS) return;
        if (!p.markup) return;

        let playerName: string | null = null;
        let plrTeam: string = p.team || 'NEUTRAL';
        let lat: number | null = null;
        let lng: number | null = null;
        let pName = '';
        let skipThis = false;
        const actionParts: string[] = [];
        const actionMarkup: Plext['markup'] = [];

        for (const m of p.markup) {
          const [type, data] = m;
          if (type === 'TEXT') {
            const txt = data.plain || '';
            actionParts.push(txt);
            actionMarkup.push(m);
            if (txt.includes('destroyed the Link') ||
                txt.includes('destroyed a Control Field') ||
                txt.includes('destroyed the') ||
                txt.includes('Your Link')) {
              skipThis = true;
              break;
            }
          } else if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER' || type === 'FACTION') {
            playerName = data.plain || null;
            if (data.team && data.team !== 'NEUTRAL') plrTeam = data.team;
            // Force Machina
            const upper = (playerName || '').toUpperCase();
            if (upper === 'MACHINA' || upper === '__MACHINA__') plrTeam = 'MACHINA';
          } else if ((type === 'PORTAL' || type === 'LINK') && !lat && !lng) {
            // Take the FIRST portal in markup as player location (IITC style)
            if (typeof data.latE6 === 'number' && typeof data.lngE6 === 'number') {
              lat = data.latE6 / 1e6;
              lng = data.lngE6 / 1e6;
              pName = data.name || '';
            }
            actionMarkup.push(m);
          } else {
            actionMarkup.push(m);
          }
        }

        if (skipThis || !playerName || lat === null || lng === null) return;

        const action = actionParts.join('').trim();
        const actionRecord: PlayerAction | null = action
          ? {
              text: action,
              markup: actionMarkup,
            }
          : null;

        let history = playerHistories.get(playerName);
        if (!history) {
          history = {
            team: plrTeam,
            color: getPlayerColor(playerName, plrTeam),
            events: [],
          };
          playerHistories.set(playerName, history);
        }

        // Logic to insert/update event (IITC processNewData style)
        const evts = history.events;
        let i = 0;
        for (i = 0; i < evts.length; i += 1) {
          if (evts[i].time > p.time) break;
        }

        const cmp = Math.max(i - 1, 0);

        if (evts.length > 0 && evts[cmp].time === p.time) {
          // Multiple portals at same time (e.g. resos)
          if (!eventHasLatLng(evts[cmp], lat, lng)) {
            evts[cmp].latlngs.push([lat, lng]);
          }
          if (actionRecord && !evts[cmp].actions.some((existing) => existing.text === actionRecord.text)) {
            evts[cmp].actions.push(actionRecord);
          }
          return;
        }

        // Time changed. Is player still at same location?
        // Check next event
        if (evts[cmp + 1] && eventHasLatLng(evts[cmp + 1], lat, lng)) {
          if (actionRecord && !evts[cmp + 1].actions.some((existing) => existing.text === actionRecord.text)) {
            evts[cmp + 1].actions.push(actionRecord);
          }
          return;
        }

        // Check previous event
        const sameLoc = evts.length > 0 && eventHasLatLng(evts[cmp], lat, lng);
        if (sameLoc) {
          // Same location, just update time to newest
          evts[cmp].time = p.time;
          if (actionRecord && !evts[cmp].actions.some((existing) => existing.text === actionRecord.text)) {
            evts[cmp].actions.push(actionRecord);
          }
        } else {
          // New location, insert
          evts.splice(i, 0, {
            latlngs: [[lat, lng]],
            time: p.time,
            portalName: pName,
            actions: actionRecord ? [actionRecord] : [],
          });
        }
      });

      updateMap();
    });

    const ticker = setInterval(updateMap, TICK_MS);
    trackerApi._playerTrackerUnsub = unsubscribe;
    trackerApi._playerTrackerTicker = ticker;
  },
  teardown: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    if (trackerApi._playerTrackerUnsub) trackerApi._playerTrackerUnsub();
    if (trackerApi._playerTrackerTicker) clearInterval(trackerApi._playerTrackerTicker);
    api.map.setFeatures([]);
  },
};

export default PlayerTrackerPlugin;
