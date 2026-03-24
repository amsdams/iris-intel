import { render, h } from 'preact';
import { IRISOverlay } from '../ui/components/Overlay';
import { useStore, pluginManager, normalizeTeam } from '@iris/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../plugins/src/player-tracker';

// Tracks whether MapLibre has been given its initial position
let hasInitialPosition = false;

// ---------------------------------------------------------------------------
// Entity parsers
// ---------------------------------------------------------------------------

function parseEntities(data: any): {
  portals: any[];
  links: any[];
  fields: any[];
} {
  const portals: any[] = [];
  const links: any[] = [];
  const fields: any[] = [];

  if (!data.result?.map) return { portals, links, fields };

  Object.values(data.result.map).forEach((tile: any) => {
    if (!tile.gameEntities) return;

    tile.gameEntities.forEach((entity: any) => {
      const [id, , entData] = entity;
      const entType = entData[0];
      const team = normalizeTeam(entData[1]);

      if (entType === 'p') {
        portals.push({
          id,
          lat: entData[2] / 1e6,
          lng: entData[3] / 1e6,
          team,
        });
      } else if (entType === 'e') {
        links.push({
          id,
          team,
          fromPortalId: entData[2],
          fromLat: entData[3] / 1e6,
          fromLng: entData[4] / 1e6,
          toPortalId: entData[5],
          toLat: entData[6] / 1e6,
          toLng: entData[7] / 1e6,
        });
      } else if (entType === 'r') {
        const points = entData[2].map((p: any) => ({
          lat: p[1] / 1e6,
          lng: p[2] / 1e6,
        }));
        fields.push({ id, team, points });
      }
    });
  });

  return { portals, links, fields };
}

function parsePortalDetails(data: any, params: any): any | null {
  if (!data.result) return null;
  const d = data.result;

  // Parse mods — d[14] is array of 4 slots, each null or [owner, name, rarity, stats]
  const mods = (d[14] as any[])
      ?.filter(Boolean)
      .map((m: any) => ({
        owner: m[0],
        name: m[1],
        rarity: m[2],
        stats: m[3],
      })) || [];

  // Parse resonators — d[15] is array of [owner, level, energy]
  const resonators = (d[15] as any[])
      ?.map((r: any) => ({
        owner: r[0],
        level: r[1],
        energy: r[2],
      })) || [];

  return {
    id: params?.guid || '',
    lat: d[2] / 1e6,
    lng: d[3] / 1e6,
    team: normalizeTeam(d[1]),
    level: d[4],
    health: d[5],
    resCount: d[6],
    image: d[7],
    name: d[8],
    owner: d[16],
    mods,
    resonators,
  };
}

function parsePlexts(data: any): any[] {
    if (!data.result) return [];
    try {
        return data.result.map((plext: any) => {
            const [id, time, plextData] = plext;
            const { text, markup, categories, team } = plextData.plext;
            return {
                id,
                time,
                text,
                markup,
                categories,
                team: normalizeTeam(team),
            };
        });
    } catch (e) {
        console.error('IRIS: Error parsing plexts', e, data);
        return [];
    }
}

// ---------------------------------------------------------------------------
// UI bootstrap
// ---------------------------------------------------------------------------

function initUI() {
  const container = document.createElement('div');
  container.id = 'iris-root';

  if (document.body) {
    document.body.appendChild(container);
    render(h(IRISOverlay, {}), container);
  } else {
    const observer = new MutationObserver((_, obs) => {
      if (document.body) {
        document.body.appendChild(container);
        render(h(IRISOverlay, {}), container);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

pluginManager.load(PortalNamesPlugin as any);
pluginManager.load(ThemeSelectorPlugin as any);
pluginManager.load(PlayerTrackerPlugin as any);

// ---------------------------------------------------------------------------
// Message handler — bridges main world interceptor and Preact UI
// ---------------------------------------------------------------------------

window.addEventListener('message', (event) => {
  if (event.data?.type?.startsWith('IRIS')) {
    console.log('IRIS raw message received:', event.data.type, event.data);
  }

  if (event.source !== window || !event.data?.type) return;

  const { type, url, data, params} = event.data;

  switch (type) {
// Intel cookie position received — set MapLibre position immediately
// This fires before any getEntities request so the map starts at the right place
    case 'IRIS_INITIAL_POSITION': {
      const { lat, lng, zoom } = event.data;
      hasInitialPosition = true;
      // Clamp zoom to minimum 14 so portals load immediately
      useStore.getState().updateMapState(lat, lng, Math.max(zoom, 14));
      break;
    }
      // Intel tile request fired — used only for zoom level logging
    case 'IRIS_TILE_REQUEST':
      break;

      // User panned MapLibre — forward to interceptor to move Intel map
    case 'IRIS_MOVE_MAP': {
      const { center, zoom } = event.data;
      // Move Intel map
      window.postMessage(
          { type: 'IRIS_MOVE_MAP_INTERNAL', center, zoom },
          '*'
      );
      // Also update MapLibre position directly
      useStore.getState().updateMapState(center.lat, center.lng, zoom);
      break;
    }

      // Ignore echoes of internal messages
    case 'IRIS_MOVE_MAP_INTERNAL':
    case 'IRIS_GEOLOCATE':
      break;

      // Geolocation request from UI — forward to main world
    case 'IRIS_GEOLOCATE_REQUEST': {
      window.postMessage({ type: 'IRIS_GEOLOCATE' }, '*');
      break;
    }

    case 'IRIS_REQUEST_START': {
        useStore.getState().onRequestStart(event.data.url);
        break;
    }

    case 'IRIS_REQUEST_END': {
        useStore.getState().onRequestEnd();
        break;
    }

    case 'IRIS_REQUEST_FAILED': {
        useStore.getState().addFailedRequest({
            url: event.data.url,
            status: event.data.status,
            statusText: event.data.statusText,
            time: event.data.time
        });
        break;
    }

      // Portal click — forward to interceptor to trigger getPortalDetails XHR
    case 'IRIS_PORTAL_DETAILS_REQUEST': {
      window.postMessage({
        type: 'IRIS_PORTAL_DETAILS_FETCH',
        guid: event.data.guid,
      }, '*');
      break;
    }

      // Intel API data received
    case 'IRIS_DATA': {
      if (url.includes('getEntities')) {
        const { portals, links, fields } = parseEntities(data);
        const store = useStore.getState();

        // Set MapLibre initial position from the median portal on first load
        if (!hasInitialPosition && portals.length > 0) {
          hasInitialPosition = true;
          const mid = portals[Math.floor(portals.length / 2)];
          store.updateMapState(mid.lat, mid.lng, 15);
        }

        if (portals.length > 0) store.updatePortals(portals);
        if (links.length > 0) store.updateLinks(links);
        if (fields.length > 0) store.updateFields(fields);

      } else if (url.includes('getPortalDetails')) {
        const portal = parsePortalDetails(data, params);
        if (portal) useStore.getState().updatePortals([portal]);
      } else if (url.includes('getPlexts')) {
        const plexts = parsePlexts(data);
        if (plexts.length > 0) useStore.getState().updatePlexts(plexts);
      }
      break;
    }

    case 'IRIS_PLAYER_STATS': {
      const { nickname, level, ap, team } = event.data;
      useStore.getState().setPlayerStats({ nickname, level, ap, team });
      break;
    }
    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initUI();