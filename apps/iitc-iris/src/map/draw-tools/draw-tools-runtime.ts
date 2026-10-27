import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {
  IITC_DRAW_TOOLS_DEFAULT_COLOR, IITC_DRAW_TOOLS_KEY_STORAGE,
  parseIitcDrawToolsLayer, serializeIitcDrawToolsLayer, importIitcDrawToolsItems, normalizeIitcDrawToolsLabel, testPolyLine,
  type IitcDrawToolsItem, type IitcDrawToolsMarker, type IitcDrawToolsPolyline,
} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisLayerSettings, type IitcIrisRenderEntities, type IitcIrisRenderLink} from '../../messages';
import {createIitcGeodesicPolyline} from '../leaflet-geodesic';

const DRAW_TOOLS_LINE_WEIGHT = 4;
const DRAW_TOOLS_LINE_OPACITY = 0.5;
const DRAW_TOOLS_CROSSING_COLOR = '#ff4d4d';
const DRAW_TOOLS_HIGHLIGHT_COLOR = '#ffd84d';

interface DrawToolsRuntimeOptions {
  getMap: () => LeafletMap | undefined;
  getEntities: () => IitcIrisRenderEntities | undefined;
  getLayerSettings: () => IitcIrisLayerSettings;
  hasIncompletePortalData: () => boolean;
  isLinkVisible: (link: IitcIrisRenderLink) => boolean;
  clearLayers: () => void;
  addLayer: (layer: LeafletLayer) => void;
  pane: string;
}

interface DrawToolsRuntime {
  applyIitcDrawToolsAction: (message: IitcIrisMessage) => void;
  renderIitcDrawTools: () => void;
  postIitcDrawToolsStatus: (statusText?: string, error?: string) => void;
}

/** Own Draw Tools persistence, mutations, highlighting and rendering together. */
export function createDrawToolsRuntime({
  getMap, getEntities, getLayerSettings, hasIncompletePortalData, isLinkVisible, clearLayers, addLayer, pane,
}: DrawToolsRuntimeOptions): DrawToolsRuntime {
  let highlightedDrawToolsIndex: number | undefined;
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1_000_000, lngE6 / 1_000_000];

  function loadIitcDrawToolsItems(): IitcDrawToolsItem[] {
    try {
      const stored = window.localStorage.getItem(IITC_DRAW_TOOLS_KEY_STORAGE);
      return stored ? parseIitcDrawToolsLayer(stored) : [];
    } catch (error) {
      console.warn(`draw-tools: failed to load data from localStorage: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  function saveIitcDrawToolsItems(items: readonly IitcDrawToolsItem[]): void {
    window.localStorage.setItem(IITC_DRAW_TOOLS_KEY_STORAGE, serializeIitcDrawToolsLayer(items));
  }

  function getIitcDrawToolsSupportedItems(items = loadIitcDrawToolsItems()): NonNullable<IitcIrisMessage['drawToolsItems']> {
    const supportedItems: NonNullable<IitcIrisMessage['drawToolsItems']> = [];
    items.forEach((item, storageIndex) => {
      if (item.type === 'polyline') supportedItems.push({...item, storageIndex});
      if (item.type === 'marker') supportedItems.push({...item, storageIndex});
    });
    return supportedItems;
  }

  function postIitcDrawToolsStatus(statusText?: string, error?: string): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.drawToolsStatus,
      drawToolsItems: getIitcDrawToolsSupportedItems(),
      drawToolsStatusText: statusText,
      drawToolsError: error,
    } satisfies IitcIrisMessage, '*');
  }

  function getIitcDrawToolsRenderColor(color: string | undefined): string {
    if (!color) return IITC_DRAW_TOOLS_DEFAULT_COLOR;
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color : IITC_DRAW_TOOLS_DEFAULT_COLOR;
  }

  function distanceToSegmentMeters(
    point: {lat: number; lng: number},
    start: {lat: number; lng: number},
    end: {lat: number; lng: number},
  ): number {
    const map = getMap();
    if (!map) return Infinity;
    const zoom = map.getZoom();
    const pointLayer = map.project([point.lat, point.lng], zoom);
    const startLayer = map.project([start.lat, start.lng], zoom);
    const endLayer = map.project([end.lat, end.lng], zoom);
    const segmentX = endLayer.x - startLayer.x;
    const segmentY = endLayer.y - startLayer.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const t = segmentLengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((pointLayer.x - startLayer.x) * segmentX + (pointLayer.y - startLayer.y) * segmentY) / segmentLengthSquared));
    const closest = map.unproject([startLayer.x + segmentX * t, startLayer.y + segmentY * t], zoom);
    return map.distance([point.lat, point.lng], closest);
  }

  function getIitcDrawToolsItemDistanceMeters(item: IitcDrawToolsItem, lat: number, lng: number): number {
    const map = getMap();
    if (!map) return Infinity;
    const point = {lat, lng};

    if (item.type === 'marker') return map.distance([lat, lng], [item.latLng.lat, item.latLng.lng]);
    if (item.type !== 'polyline') return Infinity;

    let closest = Infinity;
    for (let index = 1; index < item.latLngs.length; index += 1) {
      closest = Math.min(closest, distanceToSegmentMeters(point, item.latLngs[index - 1], item.latLngs[index]));
    }
    return closest;
  }

  function snapIitcDrawToolsToPortals(): void {
    const latestEntities = getEntities();
    const map = getMap();
    if (!map || !latestEntities) {
      postIitcDrawToolsStatus(undefined, 'snap unavailable');
      return;
    }

    const visibleBounds = map.getBounds();
    const visiblePortals = latestEntities.portals
      .filter((portal) => !portal.isPlaceholder)
      .map((portal) => ({
        latLng: {lat: portal.latE6 / 1_000_000, lng: portal.lngE6 / 1_000_000},
        point: map.project(toLatLng(portal.latE6, portal.lngE6)),
      }))
      .filter((portal) => visibleBounds.contains(portal.latLng));

    if (visiblePortals.length === 0) {
      postIitcDrawToolsStatus('snap tested 0, moved 0', 'no visible portals');
      return;
    }

    const findClosestPortalLatLng = (latLng: {lat: number; lng: number}): {lat: number; lng: number} | undefined => {
      const point = map.project([latLng.lat, latLng.lng]);
      let bestPortal: typeof visiblePortals[number] | undefined;
      let bestDistanceSquared = Infinity;

      for (const portal of visiblePortals) {
        const distanceSquared = point.distanceTo(portal.point) ** 2;
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestPortal = portal;
        }
      }

      if (!bestPortal || (bestPortal.latLng.lat === latLng.lat && bestPortal.latLng.lng === latLng.lng)) return undefined;
      return bestPortal.latLng;
    };

    let testedCount = 0;
    let changedCount = 0;
    let anyChanged = false;

    const snapLatLng = (latLng: {lat: number; lng: number}): {lat: number; lng: number} => {
      if (!visibleBounds.contains(latLng)) return latLng;
      testedCount += 1;
      const snapped = findClosestPortalLatLng(latLng);
      if (!snapped) return latLng;
      changedCount += 1;
      anyChanged = true;
      return snapped;
    };

    const items = loadIitcDrawToolsItems().map((item): IitcDrawToolsItem => {
      if (item.type === 'marker') return {...item, latLng: snapLatLng(item.latLng)};
      if (item.type === 'circle') return {...item, latLng: snapLatLng(item.latLng)};
      if (item.type === 'polyline') return {...item, latLngs: item.latLngs.map(snapLatLng)};
      if (item.type === 'polygon') return {...item, latLngs: item.latLngs.map(snapLatLng)};
      return item;
    });

    if (anyChanged) {
      saveIitcDrawToolsItems(items);
      renderIitcDrawTools();
    }

    const incompleteWarning = hasIncompletePortalData() ? '; portal data may be incomplete' : '';
    postIitcDrawToolsStatus(`snap tested ${testedCount}, moved ${changedCount}${incompleteWarning}`);
  }

  function deleteIitcDrawToolsItemAt(lat: number, lng: number, itemType?: 'polyline' | 'marker'): boolean {
    const items = loadIitcDrawToolsItems();
    let bestIndex = -1;
    let bestDistance = Infinity;

    items.forEach((item, index) => {
      if (itemType && item.type !== itemType) return;
      const distance = getIitcDrawToolsItemDistanceMeters(item, lat, lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex === -1 || bestDistance > 100) return false;
    saveIitcDrawToolsItems(items.filter((_, index) => index !== bestIndex));
    renderIitcDrawTools();
    postIitcDrawToolsStatus();
    return true;
  }

  function applyIitcDrawToolsAction(message: IitcIrisMessage): void {
    const action = message.drawToolsAction;
    if (!action) return;

    if (action === 'requestStatus') {
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'highlightIndex') {
      highlightedDrawToolsIndex = message.drawToolsIndex;
      renderIitcDrawTools();
      return;
    }

    if (action === 'clear') {
      highlightedDrawToolsIndex = undefined;
      saveIitcDrawToolsItems(message.drawToolsItemType
        ? loadIitcDrawToolsItems().filter((item) => item.type !== message.drawToolsItemType)
        : []);
      renderIitcDrawTools();
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'deleteAt') {
      highlightedDrawToolsIndex = undefined;
      if (message.drawToolsLatLngs?.[0]) {
        deleteIitcDrawToolsItemAt(message.drawToolsLatLngs[0].lat, message.drawToolsLatLngs[0].lng, message.drawToolsItemType);
      }
      return;
    }

    if (action === 'deleteIndex') {
      highlightedDrawToolsIndex = undefined;
      const items = loadIitcDrawToolsItems();
      if (message.drawToolsIndex !== undefined && items[message.drawToolsIndex]) {
        saveIitcDrawToolsItems(items.filter((_, index) => index !== message.drawToolsIndex));
        renderIitcDrawTools();
      }
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'rename') {
      const items = loadIitcDrawToolsItems();
      if (message.drawToolsIndex !== undefined && items[message.drawToolsIndex]?.type === 'marker') {
        const nextItems = items.map((item, index) => index === message.drawToolsIndex && item.type === 'marker'
          ? {...item, label: normalizeIitcDrawToolsLabel(message.drawToolsLabel)}
          : item);
        saveIitcDrawToolsItems(nextItems);
        renderIitcDrawTools();
      }
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'undo') {
      highlightedDrawToolsIndex = undefined;
      const items = loadIitcDrawToolsItems();
      const index = [...items].reverse().findIndex((item) => !message.drawToolsItemType || item.type === message.drawToolsItemType);
      if (index >= 0) {
        const storageIndex = items.length - 1 - index;
        saveIitcDrawToolsItems(items.filter((_, itemIndex) => itemIndex !== storageIndex));
        renderIitcDrawTools();
      }
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'import') {
      highlightedDrawToolsIndex = undefined;
      try {
        const importedItems = parseIitcDrawToolsLayer(message.drawToolsJson ?? '').filter((item) => item.type === 'polyline' || item.type === 'marker');
        const nextItems = importIitcDrawToolsItems(loadIitcDrawToolsItems(), importedItems, {merge: message.drawToolsMerge !== false});
        saveIitcDrawToolsItems(nextItems);
        renderIitcDrawTools();
        postIitcDrawToolsStatus();
      } catch (error) {
        postIitcDrawToolsStatus(undefined, error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (action === 'snapToPortals') {
      highlightedDrawToolsIndex = undefined;
      snapIitcDrawToolsToPortals();
      return;
    }

    const items = loadIitcDrawToolsItems();
    if (action === 'addMarker' && message.drawToolsLatLngs?.[0]) {
      const latLng = message.drawToolsLatLngs[0];
      saveIitcDrawToolsItems([...items, {
        type: 'marker',
        latLng,
        color: message.drawToolsColor ?? IITC_DRAW_TOOLS_DEFAULT_COLOR,
        label: normalizeIitcDrawToolsLabel(message.drawToolsLabel),
      }]);
      renderIitcDrawTools();
      postIitcDrawToolsStatus();
      return;
    }

    if (action === 'addPolyline' && message.drawToolsLatLngs && message.drawToolsLatLngs.length >= 2) {
      saveIitcDrawToolsItems([...items, {
        type: 'polyline',
        latLngs: message.drawToolsLatLngs,
        color: message.drawToolsColor ?? IITC_DRAW_TOOLS_DEFAULT_COLOR,
      }]);
      renderIitcDrawTools();
      postIitcDrawToolsStatus();
    }
  }

  function createIitcDrawToolsMarkerIcon(color = IITC_DRAW_TOOLS_DEFAULT_COLOR): L.DivIcon {
    const markerColor = getIitcDrawToolsRenderColor(color);
    return L.divIcon({
      className: 'iitc-iris-draw-tools-marker',
      html: [
        `<svg viewBox="0 0 25 41" style="fill:${markerColor}" aria-hidden="true" focusable="false">`,
        '<path d="M1.36241844765,18.67488124675 A12.5,12.5 0 1,1 23.63758155235,18.67488124675 L12.5,40.5336158073 Z" style="stroke:none;" />',
        '<path d="M1.80792170975,18.44788599685 A12,12 0 1,1 23.19207829025,18.44788599685 L12.5,39.432271175 Z" style="stroke:#000000; stroke-width:1px; stroke-opacity:0.15; fill:none;" />',
        '<path d="M2.921679865,17.8803978722 A10.75,10.75 0 1,1 22.078320135,17.8803978722 L12.5,36.6789095943 Z" style="stroke:#ffffff; stroke-width:1.5px; stroke-opacity:0.35; fill:none;" />',
        '<path d="M19.86121593215,17.25 L12.5,21.5 L5.13878406785,17.25 L5.13878406785,8.75 L12.5,4.5 L19.86121593215,8.75 Z M7.7368602792,10.25 L17.2631397208,10.25 L12.5,18.5 Z M12.5,13 L7.7368602792,10.25 M12.5,13 L17.2631397208,10.25 M12.5,13 L12.5,18.5 M19.86121593215,17.25 L16.39711431705,15.25 M5.13878406785,17.25 L8.60288568295,15.25 M12.5,4.5 L12.5,8.5" style="stroke:#ffffff; stroke-width:1.25px; stroke-opacity:1; fill:none;" />',
        '</svg>',
      ].join(''),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }

  function createIitcDrawToolsPolyline(item: IitcDrawToolsPolyline): LeafletLayer {
    return createIitcGeodesicPolyline(item.latLngs.map((latLng) => [latLng.lat, latLng.lng]), {
      pane,
      color: getIitcDrawToolsRenderColor(item.color),
      weight: DRAW_TOOLS_LINE_WEIGHT,
      opacity: DRAW_TOOLS_LINE_OPACITY,
      fill: false,
      interactive: false,
    });
  }

  function createHighlightedIitcDrawToolsPolyline(item: IitcDrawToolsPolyline): LeafletLayer {
    return createIitcGeodesicPolyline(item.latLngs.map((latLng) => [latLng.lat, latLng.lng]), {
      pane,
      color: DRAW_TOOLS_HIGHLIGHT_COLOR,
      weight: DRAW_TOOLS_LINE_WEIGHT + 5,
      opacity: 0.95,
      fill: false,
      interactive: false,
    });
  }

  function createIitcDrawToolsCrossingLink(link: IitcIrisRenderLink): LeafletLayer {
    return createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
      pane,
      color: DRAW_TOOLS_CROSSING_COLOR,
      opacity: 0.95,
      weight: 4,
      dashArray: '4,4',
      interactive: false,
    });
  }

  function renderIitcDrawToolsCrossings(items: readonly IitcDrawToolsItem[]): void {
    const latestEntities = getEntities();
    const layerSettings = getLayerSettings();
    if (!latestEntities || !layerSettings.drawnLinks || !layerSettings.links) return;

    const polylines = items.filter((item): item is IitcDrawToolsPolyline => item.type === 'polyline');
    if (polylines.length === 0) return;

    const crossingLinkGuids = new Set<string>();
    for (const link of latestEntities.links) {
      if (!isLinkVisible(link)) continue;
      if (polylines.some((item) => testPolyLine(item.latLngs, [
        {lat: link.oLatE6 / 1_000_000, lng: link.oLngE6 / 1_000_000},
        {lat: link.dLatE6 / 1_000_000, lng: link.dLngE6 / 1_000_000},
      ]))) {
        crossingLinkGuids.add(link.guid);
      }
    }

    for (const link of latestEntities.links) {
      if (crossingLinkGuids.has(link.guid)) addLayer(createIitcDrawToolsCrossingLink(link));
    }
  }

  function createIitcDrawToolsMarker(item: IitcDrawToolsMarker): LeafletLayer {
    return L.marker([item.latLng.lat, item.latLng.lng], {
      pane,
      icon: createIitcDrawToolsMarkerIcon(item.color),
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000,
    });
  }

  function createHighlightedIitcDrawToolsMarker(item: IitcDrawToolsMarker): LeafletLayer {
    return L.circleMarker([item.latLng.lat, item.latLng.lng], {
      pane,
      radius: 16,
      color: DRAW_TOOLS_HIGHLIGHT_COLOR,
      weight: 3,
      opacity: 0.95,
      fill: false,
      interactive: false,
    });
  }

  function renderIitcDrawTools(): void {
    const layerSettings = getLayerSettings();
    clearLayers();
    const items = loadIitcDrawToolsItems();
    let highlightedItem: IitcDrawToolsItem | undefined;
    for (const [index, item] of items.entries()) {
      if (highlightedDrawToolsIndex === index) highlightedItem = item;
      if (item.type === 'polyline' && layerSettings.drawnLinks) {
        addLayer(createIitcDrawToolsPolyline(item));
      } else if (item.type === 'marker' && layerSettings.drawnMarkers) {
        addLayer(createIitcDrawToolsMarker(item));
      }
    }
    renderIitcDrawToolsCrossings(items);
    if (highlightedItem?.type === 'polyline' && layerSettings.drawnLinks) {
      addLayer(createHighlightedIitcDrawToolsPolyline(highlightedItem));
    } else if (highlightedItem?.type === 'marker' && layerSettings.drawnMarkers) {
      addLayer(createHighlightedIitcDrawToolsMarker(highlightedItem));
    }
  }

  return {applyIitcDrawToolsAction, renderIitcDrawTools, postIitcDrawToolsStatus};
}
