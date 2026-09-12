import {normalizeIitcDrawToolsLabel} from '@iris/iitc-core';
import type {
  IitcIrisDrawToolsItem,
  IitcIrisMessage,
} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';

export function postDrawToolsAction(message: Omit<IitcIrisMessage, 'type'>): void {
  window.postMessage(
    {
      type: IITC_IRIS_MESSAGES.drawTools,
      ...message,
    } satisfies IitcIrisMessage,
    '*'
  );
}

export function buildAddMarkerPayload(
  target: {lat: number; lng: number; label: string} | null,
  drawToolsMarkerLabel: string,
  color: string
): Omit<IitcIrisMessage, 'type'> | null {
  if (!target) return null;
  const label = normalizeIitcDrawToolsLabel(drawToolsMarkerLabel) ?? normalizeIitcDrawToolsLabel(target.label);
  return {
    drawToolsAction: 'addMarker',
    drawToolsColor: color,
    drawToolsLabel: label ?? '',
    drawToolsLatLngs: [{lat: target.lat, lng: target.lng}],
  };
}

export function buildRenameMarkerPayload(
  item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>,
  label: string
): {payload: Omit<IitcIrisMessage, 'type'>; statusText: string} | null {
  const normalizedLabel = normalizeIitcDrawToolsLabel(label);
  if (normalizedLabel === item.label) return null;
  return {
    payload: {
      drawToolsAction: 'rename',
      drawToolsIndex: item.storageIndex,
      drawToolsLabel: normalizedLabel ?? '',
    },
    statusText: normalizedLabel ? 'draw marker renamed' : 'draw marker label cleared',
  };
}

export function buildClearDrawToolsPayload(
  itemType?: 'polyline' | 'marker'
): {payload: Omit<IitcIrisMessage, 'type'>; statusText: string} {
  return {
    payload: {
      drawToolsAction: 'clear',
      drawToolsItemType: itemType,
    },
    statusText:
      itemType === 'polyline'
        ? 'draw links cleared'
        : itemType === 'marker'
          ? 'draw markers cleared'
          : 'draw items cleared',
  };
}
