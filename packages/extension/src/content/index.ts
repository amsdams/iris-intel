import { render, h } from 'preact';
import { ITTCAOverlay } from '../ui/components/Overlay';
import { useStore, pluginManager } from '@ittca/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';

/**
 * Main Content Script
 */

function initUI() {
  const container = document.createElement('div');
  container.id = 'ittca-root';
  
  if (document.body) {
    document.body.appendChild(container);
    render(h(ITTCAOverlay, {}), container);
  } else {
    // If body is not available yet, wait for it
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

// Initialize plugins
pluginManager.load(PortalNamesPlugin as any);

// Listen for data from the "main world" interceptor
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) {
    return;
  }

  const { type, url, data, params, center, zoom } = event.data;

  if (type === 'ITTCA_MAP_SYNC') {
    useStore.getState().updateMapState(center.lat, center.lng, zoom);
    return;
  }

  if (type !== 'ITTCA_DATA') {
    return;
  }

  // Simple parsing for POC
  if (url.includes('/r/getEntities')) {
    const { updatePortals, updateLinks, updateFields } = useStore.getState();
    const portals: any[] = [];
    const links: any[] = [];
    const fields: any[] = [];
    
    if (data.result?.map) {
      Object.values(data.result.map).forEach((tile: any) => {
        if (tile.gameEntities) {
          tile.gameEntities.forEach((entity: any) => {
            const [id, time, entData] = entity;
            const type = entData[0];
            const team = entData[1];

            if (type === 'p') { // Portal
              portals.push({
                id,
                lat: entData[2] / 1e6,
                lng: entData[3] / 1e6,
                team,
              });
            } else if (type === 'l') { // Link
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
            } else if (type === 'r') { // Region (Field)
              const points = entData[2].map((p: any) => ({
                lat: p[1] / 1e6,
                lng: p[2] / 1e6,
              }));
              fields.push({
                id,
                team,
                points,
              });
            }
          });
        }
      });
    }
    
    if (portals.length > 0) updatePortals(portals);
    if (links.length > 0) updateLinks(links);
    if (fields.length > 0) updateFields(fields);
  } else if (url.includes('/r/getPortalDetails')) {
    const { updatePortals } = useStore.getState();
    if (data.result) {
      const entData = data.result;
      const id = params?.guid || ''; 
      updatePortals([{
        id,
        lat: entData[2] / 1e6,
        lng: entData[3] / 1e6,
        team: entData[1],
        name: entData[8], // Name is at index 8
      }]);
    }
  }
});

initUI();
console.log('ITTCA: Content script initialized');
