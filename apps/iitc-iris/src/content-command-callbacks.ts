import type {IitcIrisCommTab, IitcIrisMapContextPortalAnchor, IitcIrisMissionSource} from './messages';
import type {PostMessageFn} from './shell/sheet-navigation-actions';
import {getIitcIrisPrimaryMenuEffect, type IitcIrisPrimaryMenuContext} from './shell/primary-menu';
import {zoomToAndShowPortalAction} from './portals/selection-actions';
import type {IitcIrisMapContextSelection} from './portals/selection-lifecycle';
import type {IitcIrisSheetId, IitcIrisPrimaryMenuId} from './shell/menu-registry';

/** Commands with context guards, argument adaptation, or navigation/cancellation ordering. */

export function centerMapContextCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setMapView: (lat: number, lng: number, zoom: number) => void,
): void {
  if (!mapContext) return;
  setMapView(mapContext.lat, mapContext.lng, mapContext.zoom);
}

export function selectMapContextAnchorCommand(
  anchor: IitcIrisMapContextPortalAnchor,
  zoom: number,
  postMessage: PostMessageFn,
): void {
  zoomToAndShowPortalAction(anchor.guid, anchor.latE6, anchor.lngE6, zoom, postMessage);
}

export function openCommPanelCommand(
  tab: IitcIrisCommTab | undefined,
  refreshComm: (t: IitcIrisCommTab) => void,
  openSheet: (s: IitcIrisSheetId) => void,
): void {
  if (tab) refreshComm(tab);
  openSheet('comm');
}

export function selectCommTabCommand(
  tab: IitcIrisCommTab,
  activeSheet: IitcIrisSheetId,
  commStateTab: IitcIrisCommTab,
  refreshComm: (t: IitcIrisCommTab) => void,
  openSheet: (s: IitcIrisSheetId) => void,
): void {
  if (activeSheet === 'comm' && commStateTab === tab) return;
  refreshComm(tab);
  if (activeSheet !== 'comm') openSheet('comm');
}

export function toggleCommPanelCommand(
  tab: IitcIrisCommTab | undefined,
  activeSheet: IitcIrisSheetId,
  commStateTab: IitcIrisCommTab,
  closeSheetToMap: () => void,
  openCommPanel: (t?: IitcIrisCommTab) => void,
): void {
  if (activeSheet === 'comm' && (!tab || commStateTab === tab)) {
    closeSheetToMap();
    return;
  }
  openCommPanel(tab);
}

export function toggleMissionsSheetCommand(
  source: IitcIrisMissionSource,
  activeSheet: IitcIrisSheetId,
  missionsStateSource: IitcIrisMissionSource | undefined,
  closeSheetToMap: () => void,
  openSheet: (s: IitcIrisSheetId) => void,
  refreshMissions: (s: IitcIrisMissionSource) => void,
): void {
  if (activeSheet === 'missions' && missionsStateSource === source) {
    closeSheetToMap();
    return;
  }
  openSheet('missions');
  refreshMissions(source);
}

export function togglePrimaryMenuCommand(
  menu: IitcIrisPrimaryMenuId,
  state: IitcIrisPrimaryMenuContext,
  closeSheetToMap: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
  toggleCommPanel: () => void,
  toggleSheet: (sheet: IitcIrisSheetId) => void,
): void {
  const effect = getIitcIrisPrimaryMenuEffect(menu, state);
  if (effect.kind === 'closeSheet') {
    closeSheetToMap();
  } else if (effect.kind === 'openSheet') {
    openSheet(effect.sheet);
  } else if (effect.kind === 'toggleComm') {
    toggleCommPanel();
  } else if (effect.kind === 'toggleSheet') {
    toggleSheet(effect.sheet);
  }
}
