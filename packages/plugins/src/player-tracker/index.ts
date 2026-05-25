import { IRISPlugin, IRIS_API, Plext } from '@iris/plugin-sdk';
import {
  PLAYER_TRACKER_HISTORY_EXPIRATION_MS,
  PLAYER_TRACKER_MAX_DISPLAY_EVENTS,
  PLAYER_TRACKER_MIN_ZOOM,
  PLAYER_TRACKER_TICK_MS,
  processPlayerTrackerPlexts,
  prunePlayerTrackerHistories,
  type PlayerTrackerEvent,
  type PlayerTrackerHistory,
} from '@iris/core';

interface PlayerTrackerApi extends IRIS_API {
  _playerTrackerUnsub?: () => void;
  _playerTrackerMapUnsub?: () => void;
  _playerTrackerTicker?: ReturnType<typeof setInterval>;
}

const PlayerTrackerPlugin: IRISPlugin = {
  manifest: {
    id: 'player-tracker',
    name: 'Player Tracker',
    version: '2.0.0',
    description: 'Visualizes player movement paths from COMM messages.',
    author: 'IRIS Team (DanielOnDiordna inspired)',
    defaultEnabled: false,
    capabilities: ['overlay', 'comm', 'highlighter'],
  },
  setup: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    let playerHistories = new Map<string, PlayerTrackerHistory>();
    let trackerVisible = api.map.getZoom() >= PLAYER_TRACKER_MIN_ZOOM;
    let hasPublishedFeatures = false;

    // Helper to get average LatLng for an event
    const getLatLngFromEvent = (event: PlayerTrackerEvent): [number, number] => {
        let lats = 0;
        let lngs = 0;
        event.latlngs.forEach(([lat, lng]) => {
            lats += lat;
            lngs += lng;
        });
        return [lats / event.latlngs.length, lngs / event.latlngs.length];
    };

    // Helper to check if event has a specific LatLng
    // Player-specific random color based on name hash (IITC style)
    const getPlayerColor = (_name: string, team: string): string => {
        const colors = api.ui.getThemeColors();
        const teamKey = api.utils.normalizeTeam(team) as keyof ReturnType<typeof api.ui.getThemeColors>;
        return colors[teamKey] || '#ffffff';
    };

    // Faction color helper
    const getFactionColor = (team: string): string => {
        const colors = api.ui.getThemeColors();
        const teamKey = api.utils.normalizeTeam(team) as keyof ReturnType<typeof api.ui.getThemeColors>;
        return colors[teamKey] || '#ffffff';
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
        playerHistories = prunePlayerTrackerHistories(playerHistories);
    };

    const clearMap = (): void => {
        if (!hasPublishedFeatures) return;
        api.map.setFeatures([]);
        hasPublishedFeatures = false;
    };

    const updateMap = (): void => {
        const now = Date.now();
        discardOldData();

        if (!trackerVisible) {
            clearMap();
            return;
        }

        const finalFeatures: GeoJSON.Feature[] = [];

        playerHistories.forEach((history, name) => {
            if (history.events.length === 0) return;

            const events = history.events;
            const evtsLength = events.length;
            
            // 1. Draw Traces (Lines)
            // Show up to MAX_DISPLAY_EVENTS segments
            const startIndex = Math.max(0, evtsLength - PLAYER_TRACKER_MAX_DISPLAY_EVENTS);
            for (let i = evtsLength - 1; i > startIndex; i -= 1) {
                const curr = events[i];
                const prev = events[i-1];
                
                const currPos = getLatLngFromEvent(curr);
                const prevPos = getLatLngFromEvent(prev);
                
                // Don't draw line if same location (should be handled by logic, but safety check)
                if (currPos[0] === prevPos[0] && currPos[1] === prevPos[1]) continue;

                const ageBucket = Math.floor((now - curr.time) / (PLAYER_TRACKER_HISTORY_EXPIRATION_MS / 4));
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
                    color: getPlayerColor(name, history.team),
                        opacity,
                        weight, // Used by some renderers, IRIS uses opacity mostly
                    },
                });
            }

            // 2. Draw Player Marker (Point)
            const lastEvent = events[evtsLength - 1];
            const lastPos = getLatLngFromEvent(lastEvent);
            const agoText = formatAgo(lastEvent.time, now);

            const markerAgeBucket = Math.floor((now - lastEvent.time) / (PLAYER_TRACKER_HISTORY_EXPIRATION_MS / 4));
            const markerOpacity = Math.max(0.1, 1 - 0.2 * markerAgeBucket);

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
                    opacity: markerOpacity,
                    isPlayerMarker: true,
                    label: `${name}, ${agoText}`,
                    time: lastEvent.time,
                    portalName: lastEvent.portalName,
                    actions: lastEvent.actions, // Pass actions array
                },
            });
        });

        if (finalFeatures.length > 0 || hasPublishedFeatures) {
            api.map.setFeatures(finalFeatures);
            hasPublishedFeatures = finalFeatures.length > 0;
        }
    };

    const rebuildFromPlexts = (plexts: Plext[]): void => {
      if (!trackerVisible) {
        discardOldData();
        clearMap();
        return;
      }

      const result = processPlayerTrackerPlexts({
        plexts,
        expirationMs: PLAYER_TRACKER_HISTORY_EXPIRATION_MS,
        maxEvents: PLAYER_TRACKER_MAX_DISPLAY_EVENTS,
      });
      playerHistories = result.histories;

      updateMap();
    };

    rebuildFromPlexts(api.plexts.getAll());

    const unsubscribe = api.plexts.subscribe(rebuildFromPlexts);
    const mapUnsubscribe = api.map.subscribe((mapState) => {
      const shouldShowTracker = mapState.zoom >= PLAYER_TRACKER_MIN_ZOOM;
      if (shouldShowTracker === trackerVisible) return;

      trackerVisible = shouldShowTracker;
      if (trackerVisible) {
        rebuildFromPlexts(api.plexts.getAll());
      } else {
        clearMap();
      }
    });

    const ticker = setInterval(updateMap, PLAYER_TRACKER_TICK_MS);
    trackerApi._playerTrackerUnsub = unsubscribe;
    trackerApi._playerTrackerMapUnsub = mapUnsubscribe;
    trackerApi._playerTrackerTicker = ticker;
  },
  teardown: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    if (trackerApi._playerTrackerUnsub) trackerApi._playerTrackerUnsub();
    if (trackerApi._playerTrackerMapUnsub) trackerApi._playerTrackerMapUnsub();
    if (trackerApi._playerTrackerTicker) clearInterval(trackerApi._playerTrackerTicker);
    trackerApi._playerTrackerUnsub = undefined;
    trackerApi._playerTrackerMapUnsub = undefined;
    trackerApi._playerTrackerTicker = undefined;
    api.map.setFeatures([]);
  },
};

export default PlayerTrackerPlugin;
