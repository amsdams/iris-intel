import {copyIitcIrisText} from './content-feedback';
import {
  formatAnchorPortalGuids,
  formatMapContextIntelUrl,
  formatMapContextLatLng,
  formatPortalIntelUrl,
} from './content-map-context';
import type {IitcIrisMapContextSelection} from './selection-lifecycle';

export function copySelectedPortalLink(
  selectedPortal: {latE6: number; lngE6: number; guid: string} | null,
  zoom: number,
  setStatus: (msg: string) => void
): void {
  if (!selectedPortal) return;
  const portalUrl = formatPortalIntelUrl(selectedPortal, zoom);
  copyIitcIrisText(portalUrl, {setStatus, successStatus: 'portal link copied'});
}

export function copySelectedPortalGuid(
  selectedPortal: {guid: string} | null,
  setStatus: (msg: string) => void
): void {
  if (!selectedPortal) return;
  copyIitcIrisText(selectedPortal.guid, {setStatus, successStatus: 'portal guid copied'});
}

export function copySelectedPortalTitle(
  selectedPortal: {title?: string; guid: string} | null,
  setStatus: (msg: string) => void
): void {
  if (!selectedPortal) return;
  copyIitcIrisText(selectedPortal.title || selectedPortal.guid, {setStatus, successStatus: 'portal title copied'});
}

export function copyMapContextLatLng(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void
): void {
  if (!mapContext) return;
  copyIitcIrisText(formatMapContextLatLng(mapContext.lat, mapContext.lng), {setStatus, successStatus: 'coords copied'});
}

export function copyMapContextUrl(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void
): void {
  if (!mapContext) return;
  copyIitcIrisText(formatMapContextIntelUrl(mapContext.lat, mapContext.lng, mapContext.zoom), {setStatus, successStatus: 'context url copied'});
}

export function copyMapContextGuid(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void
): void {
  if (!mapContext?.guid) return;
  copyIitcIrisText(mapContext.guid, {setStatus, successStatus: `${mapContext.target} guid copied`});
}

export function copyMapContextPortalGuids(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void
): void {
  if (!mapContext?.portalGuids?.length) return;
  copyIitcIrisText(formatAnchorPortalGuids(mapContext.portalGuids), {setStatus, successStatus: 'anchor guids copied'});
}
