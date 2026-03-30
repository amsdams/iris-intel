import { IRISPlugin, IRIS_API, Plext } from '@iris/plugin-sdk';

interface Location {
  lat: number;
  lng: number;
  portalName: string;
  time: number;
  faction?: string;
}

interface PlayerEvent {
  latlngs: [number, number][];
  time: number;
  portalName: string;
}

interface PlayerHistory {
  team: string;
  events: PlayerEvent[];
}

interface PlayerTrackerApi extends IRIS_API {
  _playerTrackerUnsub?: () => void;
  _playerTrackerTicker?: ReturnType<typeof setInterval>;
}

type TimedFeatureProperties = {
  time?: number;
  opacity?: number;
} & Record<string, unknown>;

const EXPIRATION_MS = 60 * 60 * 1000; // 1 hour
const TICK_MS = 30 * 1000; // 30 seconds update
const MAX_DISPLAY_EVENTS = 10;

const PlayerTrackerPlugin: IRISPlugin = {
  manifest: {
    id: 'player-tracker',
    name: 'Player Tracker',
    version: '1.2.0',
    description: 'Visualizes player movement paths from COMM messages with fading.',
    author: 'IRIS Team',
  },
  setup: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    const playerHistories = new Map<string, PlayerHistory>();
    const processedPlextIds = new Set<string>();
    
    const averageLatLng = (event: PlayerEvent): [number, number] => {
        const total = event.latlngs.reduce(
            (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
            { lat: 0, lng: 0 }
        );

        return [total.lat / event.latlngs.length, total.lng / event.latlngs.length];
    };

    const eventHasLatLng = (event: PlayerEvent, lat: number, lng: number): boolean =>
        event.latlngs.some(([eventLat, eventLng]) => eventLat === lat && eventLng === lng);

    const discardOldData = (): void => {
        const limit = Date.now() - EXPIRATION_MS;

        playerHistories.forEach((history, playerName) => {
            const firstValidIndex = history.events.findIndex((event) => event.time >= limit);
            if (firstValidIndex === -1) {
                playerHistories.delete(playerName);
                return;
            }

            if (firstValidIndex > 0) {
                history.events.splice(0, firstValidIndex);
            }
        });
    };

    // Helper to get faction color
    const getFactionColor = (team: string): string => {
        const teamKey = api.utils.normalizeTeam(team);
        if (teamKey === 'E') return '#00ff00';
        if (teamKey === 'R') return '#0000ff';
        if (teamKey === 'M') return '#ff0000';
        return '#ffffff';
    };

    const updateMap = (): void => {
        const now = Date.now();
        discardOldData();

        const finalFeatures: GeoJSON.Feature[] = [];

        playerHistories.forEach((history, name) => {
            if (history.events.length === 0) {
                return;
            }

            const visibleEvents = history.events.slice(-MAX_DISPLAY_EVENTS);

            for (let i = 1; i < visibleEvents.length; i += 1) {
                const currentEvent = visibleEvents[i];
                const previousEvent = visibleEvents[i - 1];
                const age = now - currentEvent.time;
                const opacity = Math.max(0, 1 - (age / EXPIRATION_MS));

                finalFeatures.push({
                    type: 'Feature',
                    id: `player-line:${name}:${currentEvent.time}`,
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [averageLatLng(previousEvent)[1], averageLatLng(previousEvent)[0]],
                            [averageLatLng(currentEvent)[1], averageLatLng(currentEvent)[0]],
                        ],
                    },
                    properties: {
                        id: `player-line:${name}:${currentEvent.time}`,
                        color: '#ffff00',
                        name,
                        team: history.team,
                        time: currentEvent.time,
                        opacity,
                    } satisfies TimedFeatureProperties,
                });
            }

            const lastEvent = visibleEvents[visibleEvents.length - 1];
            const [lastLat, lastLng] = averageLatLng(lastEvent);
            const age = now - lastEvent.time;
            const opacity = Math.max(0.1, 1 - (age / EXPIRATION_MS));

            finalFeatures.push({
                type: 'Feature',
                id: `player:${name}`,
                geometry: {
                    type: 'Point',
                    coordinates: [lastLng, lastLat],
                },
                properties: {
                    id: `player:${name}`,
                    color: getFactionColor(history.team || 'N'),
                    name,
                    team: history.team,
                    time: lastEvent.time,
                    portalName: lastEvent.portalName,
                    lat: lastLat,
                    lng: lastLng,
                    isPlayerMarker: true,
                    opacity,
                },
            });
        });

        api.map.setFeatures(finalFeatures);
    };

    const unsubscribe = api.plexts.subscribe((plexts: Plext[]) => {
      // Sort plexts chronologically (oldest to newest)
      const sortedPlexts = [...plexts].sort((a, b) => a.time - b.time);

      sortedPlexts.forEach((p) => {
        if (processedPlextIds.has(p.id)) return;
        processedPlextIds.add(p.id);
        if (!p.markup) return;
        if (p.time < Date.now() - EXPIRATION_MS) return;

        let playerName: string | null = null;
        let location: Partial<Location> | null = null;
        let faction: string = p.team || 'N';
        let skipThisMessage = false;

        for (const m of p.markup) {
          const type = m[0];
          const data = m[1];
          if (type === 'TEXT') {
            const plain = data.plain ?? '';
            if (
              plain.includes('destroyed the Link') ||
              plain.includes('destroyed a Control Field') ||
              plain.includes('destroyed the') ||
              plain.includes('Your Link')
            ) {
              skipThisMessage = true;
              break;
            }
          } else if (type === 'PLAYER') {
            playerName = data.plain ?? null;
            // Force Machina team if name is "Machina" or similar
            const upperName = (playerName || '').toUpperCase();
            if (upperName === 'MACHINA' || upperName === '__MACHINA__') {
                faction = 'MACHINA';
            } else if (data.team && data.team !== 'NEUTRAL') {
                faction = data.team;
            }
          } else if (type === 'PORTAL' && typeof data.latE6 === 'number' && typeof data.lngE6 === 'number' && typeof data.name === 'string') {
            location = {
              lat: data.latE6 / 1e6,
              lng: data.lngE6 / 1e6,
              portalName: data.name,
              time: p.time,
            };
          }
        }

        if (!playerName || !location || location.lat === undefined || location.lng === undefined || location.portalName === undefined || location.time === undefined || skipThisMessage) {
          return;
        }

        const name = playerName;
        const lat = location.lat;
        const lng = location.lng;
        const newEvent: PlayerEvent = {
          latlngs: [[lat, lng]],
          time: location.time,
          portalName: location.portalName,
        };

        const playerHistory = playerHistories.get(name);
        if (!playerHistory || playerHistory.events.length === 0) {
          playerHistories.set(name, {
            team: faction,
            events: [newEvent],
          });
          return;
        }

        playerHistory.team = faction;
        const events = playerHistory.events;

        let insertIndex = 0;
        for (insertIndex = 0; insertIndex < events.length; insertIndex += 1) {
          if (events[insertIndex].time > location.time) break;
        }

        const compareIndex = Math.max(insertIndex - 1, 0);

        if (events[compareIndex].time === location.time) {
          events[compareIndex].latlngs.push([lat, lng]);
          return;
        }

        if (events[compareIndex + 1] && eventHasLatLng(events[compareIndex + 1], lat, lng)) {
          return;
        }

        const sameLocation = eventHasLatLng(events[compareIndex], lat, lng);
        if (sameLocation) {
          events[compareIndex].time = location.time;
          events[compareIndex].portalName = location.portalName;
        } else {
          events.splice(insertIndex, 0, newEvent);
        }
      });

      updateMap();
    });

    const ticker = setInterval(updateMap, TICK_MS);

    // Store objects on the api object for cleanup
    trackerApi._playerTrackerUnsub = unsubscribe;
    trackerApi._playerTrackerTicker = ticker;
  },
  teardown: (api: IRIS_API): void => {
    const trackerApi = api as PlayerTrackerApi;
    if (trackerApi._playerTrackerUnsub) {
      trackerApi._playerTrackerUnsub();
    }
    if (trackerApi._playerTrackerTicker) {
      clearInterval(trackerApi._playerTrackerTicker);
    }
    api.map.setFeatures([]); // Clear map
  },
};

export default PlayerTrackerPlugin;
