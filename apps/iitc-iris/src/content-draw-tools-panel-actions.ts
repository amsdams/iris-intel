import type {IitcIrisDrawToolsItem, IitcIrisDrawToolsLatLng, IitcIrisMessage} from './messages';
import {
  buildAddMarkerPayload,
  buildClearDrawToolsPayload,
  buildImportDrawToolsPayload,
  buildRenameMarkerPayload,
} from './content-draw-tools-actions';
import {
  buildAddPolylinePayload,
  buildDeleteAtPayload,
  buildDeleteIndexPayload,
  buildUndoPayload,
} from './content-draw-tools-lifecycle';
import {
  DRAW_TOOLS_DEFAULT_COLOR,
  getDrawToolsItemCenter,
} from './content-draw-tools';

export interface DrawToolsTargetLatLng {
  lat: number;
  lng: number;
}

export function addDrawToolsMarkerAction(
  target: {lat: number; lng: number; label: string} | null,
  markerLabel: string,
  color: string,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): boolean {
  const payload = buildAddMarkerPayload(target, markerLabel, color);
  if (!payload) return false;
  setClearConfirm(null);
  postAction(payload);
  setStatus('draw marker added');
  return true;
}

export function renameDrawToolsMarkerAction(
  item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>,
  label: string,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): boolean {
  const res = buildRenameMarkerPayload(item, label);
  if (!res) return false;
  postAction(res.payload);
  setStatus(res.statusText);
  return true;
}

export function addDrawToolsLinkPointAction(
  targetLatLng: DrawToolsTargetLatLng | null,
  drawToolsLinkStart: IitcIrisDrawToolsLatLng | null,
  setLinkStart: (start: IitcIrisDrawToolsLatLng | null) => void,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): void {
  if (!targetLatLng) return;
  if (!drawToolsLinkStart) {
    setLinkStart(targetLatLng);
    setStatus('draw link start set');
    return;
  }
  setClearConfirm(null);
  postAction(buildAddPolylinePayload(drawToolsLinkStart, targetLatLng, DRAW_TOOLS_DEFAULT_COLOR));
  setLinkStart(null);
  setStatus('draw link added');
}

export function deleteDrawToolsAtContextAction(
  targetLatLng: DrawToolsTargetLatLng | null,
  itemType: 'polyline' | 'marker' | undefined,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): void {
  if (!targetLatLng) return;
  setClearConfirm(null);
  postAction(buildDeleteAtPayload(targetLatLng, itemType));
  setStatus('draw item delete requested');
}

export function deleteDrawToolsItemAction(
  item: IitcIrisDrawToolsItem,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): void {
  setClearConfirm(null);
  const {payload, statusText} = buildDeleteIndexPayload(item);
  postAction(payload);
  setStatus(statusText);
}

export function undoDrawToolsItemAction(
  itemType: 'polyline' | 'marker' | undefined,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): void {
  setClearConfirm(null);
  const {payload, statusText} = buildUndoPayload(itemType);
  postAction(payload);
  setStatus(statusText);
}

export function clearDrawToolsItemsAction(
  itemType: 'polyline' | 'marker' | undefined,
  currentConfirm: 'polyline' | 'marker' | null,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  setLinkStart: (start: IitcIrisDrawToolsLatLng | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setStatus: (status: string) => void
): void {
  if (itemType && currentConfirm !== itemType) {
    setClearConfirm(itemType);
    setStatus(
      itemType === 'polyline'
        ? 'click Clear again to remove drawn links'
        : 'click Clear again to remove drawn markers'
    );
    return;
  }
  setClearConfirm(null);
  const {payload, statusText} = buildClearDrawToolsPayload(itemType);
  postAction(payload);
  if (!itemType || itemType === 'polyline') setLinkStart(null);
  setStatus(statusText);
}

export function centerDrawToolsItemAction(
  item: IitcIrisDrawToolsItem,
  cameraZoom: number,
  setMapView: (lat: number, lng: number, zoom?: number) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
): void {
  const center = getDrawToolsItemCenter(item);
  setMapView(center.lat, center.lng, Math.max(cameraZoom, 15));
  postAction({
    drawToolsAction: 'highlightIndex',
    drawToolsIndex: item.storageIndex,
  });
}

export function importDrawToolsItemsAction(
  importText: string,
  importMerge: boolean,
  setClearConfirm: (confirm: 'polyline' | 'marker' | null) => void,
  postAction: (message: Omit<IitcIrisMessage, 'type'>) => void,
  setImportStatus: (status: string) => void
): void {
  const res = buildImportDrawToolsPayload(importText, importMerge);
  if (res.success) {
    postAction(res.payload);
    setClearConfirm(null);
  }
  setImportStatus(res.statusText);
}
