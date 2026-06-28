import type {IitcIrisContextTarget} from './context-action-registry';
import type {IitcIrisSelectedKind, IitcIrisSheetId} from './menu-registry';
import type {IitcIrisMapContextPortalAnchor, IitcIrisMessage, IitcIrisSelectedPortal} from './messages';

export interface IitcIrisMapContextSelection {
  lat: number;
  lng: number;
  zoom: number;
  target: IitcIrisContextTarget;
  guid?: string;
  team?: 'E' | 'R' | 'N' | 'M';
  portalGuids?: string[];
  portalAnchors?: IitcIrisMapContextPortalAnchor[];
  distanceMeters?: number;
}

export interface IitcIrisSelectionState {
  selectedPortal: IitcIrisSelectedPortal | null;
  mapContext: IitcIrisMapContextSelection | null;
}

export interface IitcIrisSelectionView {
  selectedMapObject: IitcIrisMapContextSelection | null;
  hasSelectedObject: boolean;
  selectedPrimaryLabel: 'Selected' | 'Portal' | 'Link' | 'Field';
  activeSelectedSheet: IitcIrisSheetId;
  selectedKind: IitcIrisSelectedKind | null;
  showPortalSidePanel: boolean;
}

export interface IitcIrisPortalSelectedEffect {
  mapContext: null;
  activeSheet: Extract<IitcIrisSheetId, 'portal'>;
  cancelPanelRequests: boolean;
}

export interface IitcIrisMapContextSelectedEffect {
  mapContext: IitcIrisMapContextSelection;
  activeSheet: Extract<IitcIrisSheetId, 'view' | 'selectedLink' | 'selectedField'>;
  cancelPanelRequests: boolean;
  status: string;
}

export function getSelectionView(selection: IitcIrisSelectionState, activeSheet: IitcIrisSheetId): IitcIrisSelectionView {
  const selectedMapObject = selection.mapContext?.target === 'link' || selection.mapContext?.target === 'field'
    ? selection.mapContext
    : null;
  const hasSelectedObject = Boolean(selection.selectedPortal || selectedMapObject);
  const selectedPrimaryLabel = selectedMapObject?.target === 'link'
    ? 'Link'
    : selectedMapObject?.target === 'field'
      ? 'Field'
      : selection.selectedPortal
        ? 'Portal'
        : 'Selected';
  const activeSelectedSheet: IitcIrisSheetId = selectedMapObject?.target === 'link'
    ? 'selectedLink'
    : selectedMapObject?.target === 'field'
      ? 'selectedField'
      : selection.selectedPortal
        ? 'portal'
        : 'map';
  const selectedKind: IitcIrisSelectedKind | null = selectedMapObject?.target === 'link' || selectedMapObject?.target === 'field'
    ? selectedMapObject.target
    : selection.selectedPortal
      ? 'portal'
      : null;
  const showPortalSidePanel = Boolean(
    selection.selectedPortal && !(selectedMapObject && (activeSheet === 'selectedLink' || activeSheet === 'selectedField')),
  );

  return {
    selectedMapObject,
    hasSelectedObject,
    selectedPrimaryLabel,
    activeSelectedSheet,
    selectedKind,
    showPortalSidePanel,
  };
}

export function portalSelected(cancelPanelRequests: boolean): IitcIrisPortalSelectedEffect {
  return {
    mapContext: null,
    activeSheet: 'portal',
    cancelPanelRequests,
  };
}

export function mapContextSelected(
  message: Pick<IitcIrisMessage, 'lat' | 'lng' | 'zoom' | 'contextTarget' | 'contextGuid' | 'contextTeam' | 'contextPortalGuids' | 'contextPortalAnchors' | 'contextDistanceMeters'>,
  fallbackZoom: number,
  cancelPanelRequests: boolean,
): IitcIrisMapContextSelectedEffect | null {
  if (typeof message.lat !== 'number' || typeof message.lng !== 'number') return null;

  const target = message.contextTarget === 'link' || message.contextTarget === 'field' ? message.contextTarget : 'map';
  const activeSheet = getMapContextSheet(target);

  return {
    mapContext: {
      lat: message.lat,
      lng: message.lng,
      zoom: message.zoom ?? fallbackZoom,
      target,
      guid: message.contextGuid,
      team: message.contextTeam,
      portalGuids: message.contextPortalGuids,
      portalAnchors: message.contextPortalAnchors,
      distanceMeters: message.contextDistanceMeters,
    },
    activeSheet,
    cancelPanelRequests,
    status: `${target} context ${message.lat.toFixed(6)},${message.lng.toFixed(6)}`,
  };
}

export function getMapContextSheet(target: IitcIrisContextTarget): Extract<IitcIrisSheetId, 'view' | 'selectedLink' | 'selectedField'> {
  if (target === 'link') return 'selectedLink';
  if (target === 'field') return 'selectedField';
  return 'view';
}
