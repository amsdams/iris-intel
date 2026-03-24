import { IRISPlugin, IRIS_API, Plext } from '@iris/plugin-sdk';

interface Location {
  lat: number;
  lng: number;
  portalName: string;
  time: number;
  faction?: string;
}

const PlayerTrackerPlugin: IRISPlugin = {
  manifest: {
    id: 'player-tracker',
    name: 'Player Tracker',
    version: '1.0.0',
    description: 'Visualizes player movement paths from COMM messages.',
    author: 'IRIS Team',
  },
  setup: (api: IRIS_API) => {
    // Stores the last known location for each player
    const playerLocations = new Map<string, Location>();
    
    // We'll accumulate features here for this session
    // Note: This is a simplified in-memory store for the plugin
    let features: GeoJSON.Feature[] = [];

    // Helper to get faction color
    const getFactionColor = (team: string): string => {
        if (!team) return '#ffffff';
        const t = team.toUpperCase();
        if (t === 'E' || t === 'ENLIGHTENED') return '#00ff00';
        if (t === 'R' || t === 'RESISTANCE') return '#0000ff';
        if (t === 'M' || t === 'MACHINA') return '#ff0000';
        return '#ffffff';
    };

    const unsubscribe = api.plexts.subscribe((plexts: Plext[]) => {
      let featuresChanged = false;

      // Sort plexts chronologically (oldest to newest)
      const sortedPlexts = [...plexts].sort((a, b) => a.time - b.time);

      sortedPlexts.forEach((p) => {
        if (!p.markup) return;

        let playerName: string | null = null;
        let location: Partial<Location> | null = null;
        let faction: string = 'N';

        for (const m of p.markup) {
          const type = m[0];
          const data = m[1];
          if (type === 'PLAYER') {
            playerName = data.plain;
            faction = data.team;
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

          // If we have a last location, and it's different from current
          if (lastLoc && (lastLoc.lat !== loc.lat || lastLoc.lng !== loc.lng)) {
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
              },
            });
            featuresChanged = true;
          }

          // Update state
          playerLocations.set(name, loc);
        }
      });

      if (featuresChanged || sortedPlexts.length > 0) {
        // Re-generate the final feature list: All lines + ONE point per player
        const finalFeatures: GeoJSON.Feature[] = features.filter(f => f.geometry.type === 'LineString');
        
        playerLocations.forEach((loc: Location, name) => {
            finalFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [loc.lng, loc.lat],
                },
                properties: {
                    color: getFactionColor(loc.faction || 'N'),
                    name: name,
                    time: loc.time,
                    portalName: loc.portalName,
                    lat: loc.lat,
                    lng: loc.lng,
                    isPlayerMarker: true,
                },
            });
        });

        api.map.setFeatures(finalFeatures);
      }
    });

    // Store unsubscribe function on the api object (hacky but effective for simple plugin lifecycle)
    (api as any)._playerTrackerUnsub = unsubscribe;
  },
  teardown: (api: IRIS_API) => {
    if ((api as any)._playerTrackerUnsub) {
      ((api as any)._playerTrackerUnsub as () => void)();
    }
    api.map.setFeatures([]); // Clear map
  },
};

export default PlayerTrackerPlugin;
