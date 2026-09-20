import {
  createMissionZoomMessage,
  createCancelPanelRequestsMessage,
  createRequestInventoryMessage,
  createRequestMissionDetailsMessage,
  createRequestMissionsMessage,
  createRequestScoresMessage,
} from './content-outbound-messages';
import {
  addCommNicknameAction,
  redeemPasscodeAction,
  sendCommAction,
} from './content-comm-panel-actions';
import type {
  IitcIrisCommTab,
  IitcIrisMapContextPortalAnchor,
  IitcIrisMessage,
  IitcIrisMissionSource,
  IitcIrisPasscodeState,
  IitcIrisSearchResult,
  IitcIrisSearchState,
  IitcIrisSelectedPortal,
} from './messages';
import {
  closeIitcIrisSheet,
  openIitcIrisSheet,
  toggleIitcIrisSheet,
  type IitcIrisSheetNavigationEffect,
} from './content-sheet-navigation';
import {getIitcIrisPrimaryMenuEffect} from './content-primary-menu';
import {
  performIntelLoginRedirect,
  performIntelLogoutRedirect,
} from './content-auth-navigation';
import {
  buildSearchClearMessage,
  buildSearchPreviewMessage,
  buildSearchRequestMessage,
  buildSearchSelectMessage,
  calculateNextSearchResultIndex,
  getActiveSearchResult,
} from './content-search-actions';
import {
  clearPortalSelectionAction,
  focusSelectedPortalAction,
  selectPortalByLatLngAction,
  setPortalSectionOpenAction,
  zoomToAndShowPortalAction,
  type PortalSectionId,
} from './content-portal-selection-actions';
import {
  buildPanByMessage,
  buildSetViewMessage,
} from './content-camera-actions';
import {
  copyMapContextGuid as copyMapContextGuidHelper,
  copyMapContextLatLng as copyMapContextLatLngHelper,
  copyMapContextPortalGuids as copyMapContextPortalGuidsHelper,
  copyMapContextUrl as copyMapContextUrlHelper,
  copySelectedPortalGuid as copySelectedPortalGuidHelper,
  copySelectedPortalLink as copySelectedPortalLinkHelper,
  copySelectedPortalTitle as copySelectedPortalTitleHelper,
} from './content-copy-helpers';
import type {IitcIrisMapContextSelection} from './selection-lifecycle';
import type {IitcIrisPanDirection} from './content-keyboard-shortcuts';

import type {IitcIrisSheetId, IitcIrisSidePanelId, IitcIrisPrimaryMenuId} from './menu-registry';
import type {IitcIrisPrimaryMenuContext} from './content-primary-menu';

/** Narrow postMessage adapter type accepted by every command in this module. */
export type PostMessageFn = (message: IitcIrisMessage) => void;

// ---------------------------------------------------------------------------
// Simple panel-request commands
// ---------------------------------------------------------------------------

export function refreshScoresCommand(postMessage: PostMessageFn): void {
  postMessage(createRequestScoresMessage());
}

export function refreshInventoryCommand(postMessage: PostMessageFn): void {
  postMessage(createRequestInventoryMessage());
}

/**
 * Post a request-missions message.
 *
 * The caller (content.tsx) is responsible for supplying the resolved source,
 * including the stale-closure-safe `missionsState.source ?? 'view'` default.
 */
export function refreshMissionsCommand(postMessage: PostMessageFn, source: IitcIrisMissionSource): void {
  postMessage(createRequestMissionsMessage(source));
}

export function requestMissionDetailsCommand(postMessage: PostMessageFn, missionGuid: string): void {
  postMessage(createRequestMissionDetailsMessage(missionGuid));
}

export function zoomToMissionCommand(postMessage: PostMessageFn): void {
  postMessage(createMissionZoomMessage());
}

// ---------------------------------------------------------------------------
// Passcode / COMM commands
// ---------------------------------------------------------------------------

/**
 * Attempt to redeem a passcode.
 *
 * No-ops when `passcodeState.status === 'loading'` or the draft is empty/
 * whitespace. Returns `true` when the message was posted, `false` otherwise.
 * Delegates to `redeemPasscodeAction` from `content-comm-panel-actions`.
 */
export function redeemPasscodeCommand(
  passcodeState: IitcIrisPasscodeState,
  passcodeDraft: string,
  setPasscodeDraft: (draft: string) => void,
  postMessage: PostMessageFn,
): boolean {
  return redeemPasscodeAction(passcodeState, passcodeDraft, setPasscodeDraft, postMessage);
}

/**
 * Attempt to send a COMM message.
 *
 * No-ops when the draft is empty/whitespace or the active tab is `'alerts'`.
 * Returns `true` when the message was posted, `false` otherwise.
 * Delegates to `sendCommAction` from `content-comm-panel-actions`.
 */
export function sendCommCommand(
  commTab: IitcIrisCommTab,
  commDraft: string,
  setCommDraft: (draft: string) => void,
  postMessage: PostMessageFn,
): boolean {
  return sendCommAction(commTab, commDraft, setCommDraft, postMessage);
}

/**
 * Append `@nickname` to the current COMM draft.
 *
 * Returns the new draft string; the caller is responsible for calling the
 * state setter. Delegates to `addCommNicknameAction` from
 * `content-comm-panel-actions`.
 */
export function addCommNicknameCommand(currentDraft: string, nickname: string): string {
  return addCommNicknameAction(currentDraft, nickname);
}

// ---------------------------------------------------------------------------
// Search commands (Checkpoint 2)
// ---------------------------------------------------------------------------

/** Post a search-request message with optional confirmed flag. */
export function requestSearchCommand(
  postMessage: PostMessageFn,
  term: string,
  confirmed = false,
): void {
  postMessage(buildSearchRequestMessage(term, confirmed));
}

/**
 * Clear active search: reset local state setters and post `searchClear`.
 *
 * The empty `IitcIrisSearchState` to restore is passed in so this module
 * does not own the constant.
 */
export function clearSearchCommand(
  postMessage: PostMessageFn,
  setSearchTerm: (term: string) => void,
  setSearchState: (state: IitcIrisSearchState) => void,
  setActiveSearchResultIndex: (index: number) => void,
  emptySearchState: IitcIrisSearchState,
): void {
  setSearchTerm('');
  setSearchState(emptySearchState);
  setActiveSearchResultIndex(0);
  postMessage(buildSearchClearMessage());
}

/** Post a search-preview message for `result` (or clear preview when `null`). */
export function previewSearchResultCommand(
  postMessage: PostMessageFn,
  result: IitcIrisSearchResult | null,
): void {
  postMessage(buildSearchPreviewMessage(result));
}

/**
 * Select a search result.
 *
 * No-ops when `result.type === 'empty'`. Posts a `searchSelect` message, then
 * either closes sheets (map-focus mode) or opens the portal sheet for
 * portal/guid results.
 */
export function selectSearchResultCommand(
  result: IitcIrisSearchResult,
  zoom: boolean,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
): void {
  if (result.type === 'empty') return;
  postMessage(buildSearchSelectMessage(result, zoom));
  if (mapFocusMode) {
    closeSheets();
  } else if (result.type === 'portal' || result.type === 'guid') {
    openSheet('portal');
  }
}

/**
 * Move the active search result index by `delta`, skipping `empty` rows and
 * wrapping around.
 */
export function moveSearchSelectionCommand(
  delta: number,
  results: IitcIrisSearchResult[],
  setIndex: (updater: (current: number) => number) => void,
): void {
  setIndex((current) => calculateNextSearchResultIndex(current, delta, results));
}

/**
 * Select the currently active (non-empty) search result.
 *
 * Returns `false` when there is no active result (caller may skip
 * `preventDefault`).
 */
export function selectActiveSearchResultCommand(
  results: IitcIrisSearchResult[],
  activeIndex: number,
  zoom: boolean,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
): boolean {
  const result = getActiveSearchResult(results, activeIndex);
  if (!result) return false;
  selectSearchResultCommand(result, zoom, postMessage, mapFocusMode, closeSheets, openSheet);
  return true;
}

/**
 * Handle keyboard navigation in the search input.
 *
 * - ArrowDown / ArrowUp: move selection and call `preventDefault`.
 * - Enter: select active result (with zoom when Shift is held) and call
 *   `preventDefault` only when a result was selected.
 * - All other keys are ignored.
 *
 * NOTE: ArrowDown/ArrowUp pass `setIndex` from the caller so the actual
 * state update happens in `content.tsx`; the index used for movement is the
 * current snapshot already captured at call time.
 */
export function handleSearchKeyDownCommand(
  event: {key: string; shiftKey: boolean; preventDefault(): void},
  results: IitcIrisSearchResult[],
  activeIndex: number,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
  setIndex: (updater: (current: number) => number) => void,
): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSearchSelectionCommand(1, results, setIndex);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSearchSelectionCommand(-1, results, setIndex);
    return;
  }
  if (event.key === 'Enter') {
    const selected = selectActiveSearchResultCommand(
      results, activeIndex, event.shiftKey, postMessage, mapFocusMode, closeSheets, openSheet,
    );
    if (selected) event.preventDefault();
  }
}

// ---------------------------------------------------------------------------
// Map, context, and portal commands (Checkpoint 3)
// ---------------------------------------------------------------------------

/** Post a `setView` message. */
export function setMapViewCommand(
  lat: number,
  lng: number,
  zoom: number,
  postMessage: PostMessageFn,
): void {
  postMessage(buildSetViewMessage(lat, lng, zoom));
}

/**
 * Pan the map in one of the four cardinal directions.
 *
 * The offset in pixels is kept fixed and matches `IITC_PAN_CONTROL_OFFSET_PX`
 * in `content.tsx`; callers pass it explicitly so the command is testable.
 */
export function panMapCommand(
  direction: IitcIrisPanDirection,
  offsetPx: number,
  postMessage: PostMessageFn,
): void {
  postMessage(buildPanByMessage(direction, offsetPx));
}

/**
 * Center the map on the current map-context coordinates.
 *
 * No-ops when `mapContext` is null.
 */
export function centerMapContextCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setMapView: (lat: number, lng: number, zoom: number) => void,
): void {
  if (!mapContext) return;
  setMapView(mapContext.lat, mapContext.lng, mapContext.zoom);
}

/**
 * Zoom to and optionally show a portal on the map.
 *
 * Delegates to `zoomToAndShowPortalAction`.
 */
export function zoomToAndShowPortalCommand(
  portalGuid: string | undefined,
  latE6: number | undefined,
  lngE6: number | undefined,
  zoom: number,
  postMessage: PostMessageFn,
): void {
  zoomToAndShowPortalAction(portalGuid, latE6, lngE6, zoom, postMessage);
}

/**
 * Zoom to a map-context portal anchor.
 *
 * The caller is responsible for passing the resolved zoom level.
 */
export function selectMapContextAnchorCommand(
  anchor: IitcIrisMapContextPortalAnchor,
  zoom: number,
  postMessage: PostMessageFn,
): void {
  zoomToAndShowPortalAction(anchor.guid, anchor.latE6, anchor.lngE6, zoom, postMessage);
}

/**
 * Select a portal by `latE6`/`lngE6` coordinates.
 *
 * No-ops (returns `false`) when either coordinate is undefined. Delegates to
 * `selectPortalByLatLngAction`.
 */
export function selectPortalByLatLngCommand(
  latE6: number | undefined,
  lngE6: number | undefined,
  portalGuid: string | undefined,
  cameraZoom: number,
  postMessage: PostMessageFn,
): boolean {
  return selectPortalByLatLngAction(latE6, lngE6, portalGuid, cameraZoom, postMessage);
}

/** Post a `clearPortalSelection` message. */
export function clearPortalSelectionCommand(postMessage: PostMessageFn): void {
  clearPortalSelectionAction(postMessage);
}

/**
 * Move the camera to the selected portal.
 *
 * In map-focus mode, also calls `closeSheets`. No-ops when `selectedPortal`
 * is null.
 */
export function focusSelectedPortalCommand(
  selectedPortal: IitcIrisSelectedPortal | null,
  cameraZoom: number,
  mapFocusMode: boolean,
  setMapView: (lat: number, lng: number, zoom?: number) => void,
  closeSheets: () => void,
): void {
  focusSelectedPortalAction(selectedPortal, cameraZoom, mapFocusMode, setMapView, closeSheets);
}

/**
 * Persist and apply the open/closed state of a portal detail section.
 *
 * Delegates to `setPortalSectionOpenAction`.
 */
export function setPortalSectionOpenCommand(
  portalSections: Record<PortalSectionId, boolean>,
  section: PortalSectionId,
  open: boolean,
  setPortalSections: (sections: Record<PortalSectionId, boolean>) => void,
): void {
  setPortalSectionOpenAction(portalSections, section, open, setPortalSections);
}

// ---------------------------------------------------------------------------
// Copy commands (Checkpoint 3)
// ---------------------------------------------------------------------------

export function copyMapContextLatLngCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void,
): void {
  copyMapContextLatLngHelper(mapContext, setStatus);
}

export function copyMapContextUrlCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void,
): void {
  copyMapContextUrlHelper(mapContext, setStatus);
}

export function copyMapContextGuidCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void,
): void {
  copyMapContextGuidHelper(mapContext, setStatus);
}

export function copyMapContextPortalGuidsCommand(
  mapContext: IitcIrisMapContextSelection | null,
  setStatus: (msg: string) => void,
): void {
  copyMapContextPortalGuidsHelper(mapContext, setStatus);
}

export function copySelectedPortalLinkCommand(
  selectedPortal: {latE6: number; lngE6: number; guid: string} | null,
  zoom: number,
  setStatus: (msg: string) => void,
): void {
  copySelectedPortalLinkHelper(selectedPortal, zoom, setStatus);
}

export function copySelectedPortalGuidCommand(
  selectedPortal: {guid: string} | null,
  setStatus: (msg: string) => void,
): void {
  copySelectedPortalGuidHelper(selectedPortal, setStatus);
}

export function copySelectedPortalTitleCommand(
  selectedPortal: {title?: string; guid: string} | null,
  setStatus: (msg: string) => void,
): void {
  copySelectedPortalTitleHelper(selectedPortal, setStatus);
}

// ---------------------------------------------------------------------------
// Checkpoint 4 — Sheet/Menu/Auth/Data Source Commands
// ---------------------------------------------------------------------------

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

export function openIntelLoginCommand(
  loginBypassStorageKey: string,
  loginBypassMs: number,
  rootElement: HTMLElement | null,
  location: Location,
): void {
  performIntelLoginRedirect(loginBypassStorageKey, loginBypassMs, rootElement, location);
}

export function logoutIntelCommand(
  loginBypassStorageKey: string,
  rootElement: HTMLElement | null,
  location: Location,
): void {
  performIntelLogoutRedirect(loginBypassStorageKey, rootElement, location);
}

export function setDataSourceCommand(
  id: string,
  options: readonly {
    id: string;
    mode: 'live' | 'fixture';
    lat?: number;
    lng?: number;
    zoom?: number;
  }[],
  setDataSourceId: (id: string) => void,
  setMapView: (lat: number, lng: number, zoom: number) => void,
): void {
  setDataSourceId(id);
  const option = options.find((candidate) => candidate.id === id);
  if (!option || option.mode === 'live' || option.lat === undefined || option.lng === undefined || option.zoom === undefined) return;
  setMapView(option.lat, option.lng, option.zoom);
}
