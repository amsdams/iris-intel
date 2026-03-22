import { render, h } from 'preact';
import { ITTCAOverlay } from '../ui/components/Overlay';
import { useStore, pluginManager } from '@ittca/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';

let hasInitialPosition = false; // Only sync position once on first load

function tileKeyToLatLng(
    tileKey: string
): { lat: number; lng: number; zoom: number } | null {
  try {
    const parts = tileKey.split('_');
    if (parts.length < 3) return null;
    const zoom = parseInt(parts[0], 10);
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(zoom) || isNaN(x) || isNaN(y)) return null;
    const n = Math.pow(2, zoom);
    const lng = ((x + 0.5) / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n)));
    const lat = latRad * (180 / Math.PI);
    return { lat, lng, zoom };
  } catch (e) {
    return null;
  }
}

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
      const team = entData[1];
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
  console.log('ITTCA: portal details indices:');
  d.forEach((val: any, i: number) => {
    if (typeof val === 'string' && val.length > 0) {
      console.log(`  [${i}] = "${val}"`);
    }
  });
  return {
    id: params?.guid || '',
    lat: d[2] / 1e6,
    lng: d[3] / 1e6,
    team: d[1],
    level: d[4],
    health: d[5],
    resCount: d[6],
    image: d[7],
    name: d[8],
    owner: d[16],
  };
}

function initUI() {
  const container = document.createElement('div');
  container.id = 'ittca-root';
  if (document.body) {
    document.body.appendChild(container);
    render(h(ITTCAOverlay, {}), container);
  } else {
    const observer = new MutationObserver((_, obs) => {
      if (document.body) {
        document.body.appendChild(container);
        render(h(ITTCAOverlay, {}), container);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

pluginManager.load(PortalNamesPlugin as any);

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data?.type) return;

  const { type, url, data, params, center, zoom, tileKeys } = event.data;

  switch (type) {

    case 'ITTCA_PORTAL_DETAILS_REQUEST': {
      // Forward to main world to trigger getPortalDetails XHR
      window.postMessage({
        type: 'ITTCA_PORTAL_DETAILS_FETCH',
        guid: event.data.guid,
      }, '*');
      break;
    }
    case 'ITTCA_TILE_REQUEST': {
      console.log('ITTCA_TILE_REQUEST: Init');

      if (!tileKeys?.length) break;
      console.log('ITTCA: Intel zoom level:', tileKeys[0].split('_')[0]);
      break;
    }

    case 'ITTCA_MOVE_MAP': {
      console.log('ITTCA_MOVE_MAP: Init');
      window.postMessage(
          { type: 'ITTCA_MOVE_MAP_INTERNAL', center, zoom },
          '*'
      );
      break;
    }

    case 'ITTCA_MOVE_MAP_INTERNAL':
      console.log('ITTCA_MOVE_MAP_INTERNAL: Init');
      break;
    case 'ITTCA_GEOLOCATE':
      console.log('ITTCA_GEOLOCATE: Init');
      break;

    case 'ITTCA_GEOLOCATE_REQUEST': {
      window.postMessage({ type: 'ITTCA_GEOLOCATE' }, '*');
      break;
    }

    /*case 'ITTCA_DATA': {
      if (url.includes('/r/getEntities')) {
        console.log('ITTCA: Captured Data Batch');
        const { portals, links, fields } = parseEntities(data);
        const store = useStore.getState();
        if (portals.length > 0) store.updatePortals(portals);
        if (links.length > 0) store.updateLinks(links);
        if (fields.length > 0) store.updateFields(fields);
      } else if (url.includes('/r/getPortalDetails')) {
        const portal = parsePortalDetails(data, params);
        if (portal) useStore.getState().updatePortals([portal]);
      }
      break;
    }*/

    /*case 'ITTCA_DATA': {
      if (url.includes('/r/getEntities')) {
        console.log('ITTCA: Captured Data Batch');
        const { portals, links, fields } = parseEntities(data);
        const store = useStore.getState();

        // Derive map position from portal coordinates — much more reliable
        // than tile key math. Use the first portal's position on initial load.
        if (!hasInitialPosition && portals.length > 0) {
          hasInitialPosition = true;
          isProgrammaticMove = true;
          const firstPortal = portals[0];
          console.log('ITTCA: Setting initial position from portal:', firstPortal.lat, firstPortal.lng);
          store.updateMapState(firstPortal.lat, firstPortal.lng, 15);
          setTimeout(() => { isProgrammaticMove = false; }, 500);
        }

        if (portals.length > 0) store.updatePortals(portals);
        if (links.length > 0) store.updateLinks(links);
        if (fields.length > 0) store.updateFields(fields);

      } else if (url.includes('/r/getPortalDetails')) {
        const portal = parsePortalDetails(data, params);
        if (portal) useStore.getState().updatePortals([portal]);
      }
      break;
    }*/
    case 'ITTCA_DATA': {
      console.log('ITTCA_DATA: Init', hasInitialPosition);

      if (url.includes('/r/getEntities')) {
        console.log('ITTCA_DATA: Captured Data Batch');
        const { portals, links, fields } = parseEntities(data);
        const store = useStore.getState();

        // Set initial MapLibre position from first portal on first load only
        if (!hasInitialPosition && portals.length > 0) {
          hasInitialPosition = true;
          const mid = portals[Math.floor(portals.length / 2)];
          store.updateMapState(mid.lat, mid.lng, 15);
        }

        if (portals.length > 0) store.updatePortals(portals);
        if (links.length > 0) store.updateLinks(links);
        if (fields.length > 0) store.updateFields(fields);

      } else if (url.includes('/r/getPortalDetails')) {
        const portal = parsePortalDetails(data, params);
        if (portal) useStore.getState().updatePortals([portal]);
      }
      break;
    }
    default:
      console.log('DEFAULT: Init');

      break;
  }
});

initUI();