import type {IitcIrisMessage, IitcIrisSelectedPortal} from './messages';
import type {IitcIrisPortalDetailSectionId} from './portal-detail-section-registry';
import {
  buildClearPortalSelectionMessage,
  buildZoomToAndShowPortalMessage,
} from './content-camera-actions';
import {storePortalSections} from './content-storage-settings';
import {getPortalLatLng} from './content-map-status';

export type PortalSectionId = IitcIrisPortalDetailSectionId;

export function setPortalSectionOpenAction(
  currentSections: Record<PortalSectionId, boolean>,
  section: PortalSectionId,
  open: boolean,
  setPortalSections: (sections: Record<PortalSectionId, boolean>) => void
): void {
  const next = {...currentSections, [section]: open};
  storePortalSections(next);
  setPortalSections(next);
}

export function zoomToAndShowPortalAction(
  portalGuid: string | undefined,
  latE6: number | undefined,
  lngE6: number | undefined,
  zoom: number,
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): void {
  postMessageFn(buildZoomToAndShowPortalMessage(portalGuid, latE6, lngE6, zoom));
}

export function selectPortalByLatLngAction(
  latE6: number | undefined,
  lngE6: number | undefined,
  portalGuid: string | undefined,
  cameraZoom: number,
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): boolean {
  if (latE6 === undefined || lngE6 === undefined) return false;
  const zoom = Math.max(cameraZoom, 15);
  postMessageFn(buildZoomToAndShowPortalMessage(portalGuid, latE6, lngE6, zoom));
  return true;
}

export function clearPortalSelectionAction(
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): void {
  postMessageFn(buildClearPortalSelectionMessage());
}

export function focusSelectedPortalAction(
  selectedPortal: IitcIrisSelectedPortal | null,
  cameraZoom: number,
  mapFocusMode: boolean,
  setMapView: (lat: number, lng: number, zoom?: number) => void,
  closeSheets?: () => void
): boolean {
  if (!selectedPortal) return false;
  const {lat, lng} = getPortalLatLng(selectedPortal);
  setMapView(lat, lng, Math.max(17, cameraZoom));
  if (mapFocusMode && closeSheets) {
    closeSheets();
  }
  return true;
}
