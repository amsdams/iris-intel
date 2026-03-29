import { IRISPlugin, IRIS_API, Plext } from '@iris/plugin-sdk';

interface Location {
  lat: number;
  lng: number;
  portalName: string;
  time: number;
  faction?: string;
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
    // Stores the last known location for each player
    const playerLocations = new Map<string, Location>();
    
    // We'll accumulate features here for this session
    let features: GeoJSON.Feature[] = [];

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
        
        // Filter out expired lines
        features = features.filter((feature) => {
            const time = (feature.properties as TimedFeatureProperties | null)?.time;
            return typeof time === 'number' && (now - time) < EXPIRATION_MS;
        });

        // Re-generate final features list
        const finalFeatures: GeoJSON.Feature[] = [];

        // 1. Process Lines (Lines were added with time in properties)
        features.forEach((feature) => {
            if (feature.geometry.type === 'LineString') {
                const time = (feature.properties as TimedFeatureProperties | null)?.time ?? 0;
                const age = now - time;
                const opacity = Math.max(0, 1 - (age / EXPIRATION_MS));
                finalFeatures.push({
                    ...feature,
                    properties: { ...feature.properties, opacity }
                });
            }
        });

        // 2. Process Player Points
        playerLocations.forEach((loc: Location, name) => {
            const age = now - loc.time;
            if (age < EXPIRATION_MS) {
                const opacity = Math.max(0.1, 1 - (age / EXPIRATION_MS));
                finalFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [loc.lng, loc.lat],
                    },
                    properties: {
                        color: getFactionColor(loc.faction || 'N'),
                        name: name,
                        team: loc.faction, // Crucial for popup coloring
                        time: loc.time,
                        portalName: loc.portalName,
                        lat: loc.lat,
                        lng: loc.lng,
                        isPlayerMarker: true,
                        opacity: opacity,
                    },
                });
            } else {
                // If the player hasn't moved for over an hour, remove them from tracking
                playerLocations.delete(name);
            }
        });

        api.map.setFeatures(finalFeatures);
    };

    const unsubscribe = api.plexts.subscribe((plexts: Plext[]) => {
      // Sort plexts chronologically (oldest to newest)
      const sortedPlexts = [...plexts].sort((a, b) => a.time - b.time);

      sortedPlexts.forEach((p) => {
        if (!p.markup) return;

        let playerName: string | null = null;
        let location: Partial<Location> | null = null;
        let faction: string = p.team || 'N';

        for (const m of p.markup) {
          const type = m[0];
          const data = m[1];
          if (type === 'PLAYER') {
            playerName = data.plain;
            // Force Machina team if name is "Machina" or similar
            const upperName = (playerName || '').toUpperCase();
            if (upperName === 'MACHINA' || upperName === '__MACHINA__') {
                faction = 'MACHINA';
            } else if (data.team && data.team !== 'NEUTRAL') {
                faction = data.team;
            }
          } else if (type === 'PORTAL') {
            location = {
              lat: data.latE6 / 1e6,
              lng: data.lngE6 / 1e6,
              portalName: data.name,
              time: p.time,
            };
          }
        }

        if (playerName && location && location.lat !== undefined && location.lng !== undefined && location.portalName !== undefined && location.time !== undefined) {
          const name = playerName as string;
          const loc: Location = {
            lat: location.lat,
            lng: location.lng,
            portalName: location.portalName,
            time: location.time,
            faction
          };
          const lastLoc = playerLocations.get(name);

          // If we have a last location, and it's different from current, and it's recent
          if (lastLoc && (lastLoc.lat !== loc.lat || lastLoc.lng !== loc.lng) && (loc.time - lastLoc.time < EXPIRATION_MS)) {
            // Draw a dashed line - using Yellow (#ffff00)
            features.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [lastLoc.lng, lastLoc.lat],
                  [loc.lng, loc.lat],
                ],
              },
              properties: {
                color: '#ffff00',
                name: name,
                team: loc.faction, // Store team for correct popup coloring
                time: loc.time, // Store the time for expiration and fading
              },
            });
          }

          // Update state
          playerLocations.set(name, loc);
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
