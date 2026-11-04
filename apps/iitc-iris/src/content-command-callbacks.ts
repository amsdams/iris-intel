import {createCancelPanelRequestsMessage} from './shell/outbound-messages';
import type {IitcIrisCommTab, IitcIrisMapContextPortalAnchor, IitcIrisMessage, IitcIrisMissionSource} from './messages';
import {
  closeIitcIrisSheet, openIitcIrisSheet, toggleIitcIrisSheet, type IitcIrisSheetNavigationEffect,
} from './shell/sheet-navigation';
import {getIitcIrisPrimaryMenuEffect, type IitcIrisPrimaryMenuContext} from './shell/primary-menu';
import {zoomToAndShowPortalAction} from './portals/selection-actions';
import type {IitcIrisMapContextSelection} from './portals/selection-lifecycle';
import type {IitcIrisSheetId, IitcIrisSidePanelId, IitcIrisPrimaryMenuId} from './shell/menu-registry';

/** Commands with context guards, argument adaptation, or navigation/cancellation ordering. */
export type PostMessageFn = (message: IitcIrisMessage) => void;

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

export interface SheetNavigationSetters {
  setActiveSheet: (sheet: IitcIrisSheetId) => void;
  setActiveSidePanel: (panel: IitcIrisSidePanelId | null) => void;
  storeActiveSheet: (sheet: IitcIrisSheetId) => void;
  storeSidePanelId: (panel: IitcIrisSidePanelId | null) => void;
}

export function applySheetNavigationEffectCommand(
  effect: IitcIrisSheetNavigationEffect,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
  order: 'side-panel-first' | 'sheet-first',
): void {
  if (effect.cancelPanelRequests) {
    postMessage(createCancelPanelRequestsMessage());
  }
  if (order === 'side-panel-first') {
    setters.setActiveSidePanel(effect.activeSidePanel);
    setters.setActiveSheet(effect.activeSheet);
    setters.storeSidePanelId(effect.activeSidePanel);
    setters.storeActiveSheet(effect.activeSheet);
    return;
  }
  setters.setActiveSheet(effect.activeSheet);
  setters.storeActiveSheet(effect.activeSheet);
  setters.setActiveSidePanel(effect.activeSidePanel);
  setters.storeSidePanelId(effect.activeSidePanel);
}

export function closeSheetToMapCommand(
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(closeIitcIrisSheet({activeSheet, activeSidePanel}), postMessage, setters, 'side-panel-first');
}

export function openSheetCommand(
  target: IitcIrisSheetId,
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(openIitcIrisSheet({activeSheet, activeSidePanel}, target), postMessage, setters, 'sheet-first');
}

export function toggleSheetCommand(
  target: IitcIrisSheetId,
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(toggleIitcIrisSheet({activeSheet, activeSidePanel}, target), postMessage, setters, 'sheet-first');
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
