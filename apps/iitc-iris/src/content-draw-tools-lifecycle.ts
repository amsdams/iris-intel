import type {
  IitcIrisDrawToolsItem,
  IitcIrisDrawToolsLatLng,
  IitcIrisMessage,
} from './messages';

export function buildAddPolylinePayload(
  drawToolsLinkStart: IitcIrisDrawToolsLatLng,
  latLng: IitcIrisDrawToolsLatLng,
  color: string
): Omit<IitcIrisMessage, 'type'> {
  return {
    drawToolsAction: 'addPolyline',
    drawToolsColor: color,
    drawToolsLatLngs: [drawToolsLinkStart, latLng],
  };
}

export function buildDeleteAtPayload(
  latLng: IitcIrisDrawToolsLatLng,
  itemType?: 'polyline' | 'marker'
): Omit<IitcIrisMessage, 'type'> {
  return {
    drawToolsAction: 'deleteAt',
    drawToolsItemType: itemType,
    drawToolsLatLngs: [latLng],
  };
}

export function buildDeleteIndexPayload(
  item: IitcIrisDrawToolsItem
): {payload: Omit<IitcIrisMessage, 'type'>; statusText: string} {
  return {
    payload: {
      drawToolsAction: 'deleteIndex',
      drawToolsIndex: item.storageIndex,
    },
    statusText: `${item.type === 'polyline' ? 'draw link' : 'draw marker'} delete requested`,
  };
}

export function buildUndoPayload(
  itemType?: 'polyline' | 'marker'
): {payload: Omit<IitcIrisMessage, 'type'>; statusText: string} {
  return {
    payload: {
      drawToolsAction: 'undo',
      drawToolsItemType: itemType,
    },
    statusText:
      itemType === 'polyline'
        ? 'draw link undo requested'
        : itemType === 'marker'
          ? 'draw marker undo requested'
          : 'draw undo requested',
  };
}
