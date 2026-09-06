import { h } from 'preact';
import {
  getContextAction,
  getContextTarget,
  isContextActionVisible,
  type IitcIrisContextActionId,
} from './context-action-registry';
import { formatTeamClass } from './content-portal-analysis';
import type { IitcIrisMapContextPortalAnchor } from './messages';
import type {
  IitcIrisMapContextSelection,
} from './selection-lifecycle';

export interface IitcIrisMapNavigationPanelProps {
  canPan: boolean;
  geolocationStatus: string;
  locateBrowserPosition: () => void;
  panMap: (direction: 'north' | 'south' | 'east' | 'west') => void;
  zoomMap: (delta: number) => void;
}

export function IitcIrisMapNavigationPanel({
  canPan,
  geolocationStatus,
  locateBrowserPosition,
  panMap,
  zoomMap,
}: IitcIrisMapNavigationPanelProps): h.JSX.Element {
  return (
    <div className="iitc-iris-map-controls-section">
      <span className="iitc-iris-status">Controls</span>
      <div className="iitc-iris-map-control-row">
        <div className="iitc-iris-pan-grid" aria-label="Pan controls">
          <button className="iitc-iris-nav-button iitc-iris-pan-north" type="button" disabled={!canPan} onClick={() => panMap('north')} title="Pan north" aria-label="Pan north">N</button>
          <button className="iitc-iris-nav-button iitc-iris-pan-west" type="button" disabled={!canPan} onClick={() => panMap('west')} title="Pan west" aria-label="Pan west">W</button>
          <button className="iitc-iris-nav-button iitc-iris-pan-east" type="button" disabled={!canPan} onClick={() => panMap('east')} title="Pan east" aria-label="Pan east">E</button>
          <button className="iitc-iris-nav-button iitc-iris-pan-south" type="button" disabled={!canPan} onClick={() => panMap('south')} title="Pan south" aria-label="Pan south">S</button>
        </div>
        <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(1)} title="Zoom in" aria-label="Zoom in">+</button>
        <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(-1)} title="Zoom out" aria-label="Zoom out">-</button>
        <button className="iitc-iris-nav-button iitc-iris-nav-button-wide" type="button" onClick={locateBrowserPosition} title="Pan to current browser location">Locate</button>
      </div>
      {geolocationStatus && <span className="iitc-iris-map-control-status">{geolocationStatus}</span>}
    </div>
  );
}

export interface IitcIrisMapContextPanelProps {
  mapContext: IitcIrisMapContextSelection;
  centerMapContext: () => void;
  copyMapContextGuid: () => void;
  copyMapContextLatLng: () => void;
  copyMapContextPortalGuids: () => void;
  copyMapContextUrl: () => void;
  formatMapObjectDistance: (meters: number | undefined) => string;
  formatTeamLabel: (team: string) => string;
  selectMapContextAnchor: (anchor: IitcIrisMapContextPortalAnchor) => void;
}

export function IitcIrisMapContextPanel({
  mapContext,
  centerMapContext,
  copyMapContextGuid,
  copyMapContextLatLng,
  copyMapContextPortalGuids,
  copyMapContextUrl,
  formatMapObjectDistance,
  formatTeamLabel,
  selectMapContextAnchor,
}: IitcIrisMapContextPanelProps): h.JSX.Element {
  const target = getContextTarget(mapContext.target);

  const renderContextActionButton = (
    actionId: IitcIrisContextActionId,
    onClick: () => void,
    title?: string,
    disabled = false,
  ): h.JSX.Element | null => {
    if (!isContextActionVisible(actionId, mapContext.target)) return null;
    const action = getContextAction(actionId);
    return (
      <button
        className="iitc-iris-portal-action"
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title ?? action.title}
      >
        {action.label}
      </button>
    );
  };

  return (
    <div className="iitc-iris-map-controls-section">
      <span className="iitc-iris-status">{target.panelLabel}</span>
      {mapContext.target !== 'map' && (
        <div className="iitc-iris-map-context-row">
          <span className="iitc-iris-map-context-coords" title={mapContext.guid}>
            {target.objectLabel}
            {mapContext.team ? `, ${formatTeamLabel(mapContext.team)}` : ''}
          </span>
          {mapContext.guid && renderContextActionButton('copyGuid', copyMapContextGuid, `Copy ${mapContext.target} GUID`)}
          {mapContext.portalGuids?.length ? renderContextActionButton('copyAnchorGuids', copyMapContextPortalGuids) : null}
        </div>
      )}
      {mapContext.target !== 'map' && mapContext.distanceMeters !== undefined && (
        <div className="iitc-iris-map-context-row">
          <span className="iitc-iris-map-context-coords">
            {target.distanceLabel}: {formatMapObjectDistance(mapContext.distanceMeters)}
          </span>
        </div>
      )}
      {mapContext.target !== 'map' && mapContext.portalAnchors?.length ? mapContext.portalAnchors.map((anchor, index) => (
        <div className="iitc-iris-map-context-row" key={`${anchor.guid || 'anchor'}-${index}`}>
          <button className={`iitc-iris-map-context-anchor ${mapContext.team ? formatTeamClass(mapContext.team) : ''}`} type="button" onClick={() => selectMapContextAnchor(anchor)} title="Center and select this anchor portal">
            {mapContext.target === 'link' ? (index === 0 ? 'From' : 'To') : `Anchor ${index + 1}`}: {anchor.label}
          </button>
        </div>
      )) : null}
      <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords" title={`${mapContext.lat},${mapContext.lng}`}>
          {mapContext.lat.toFixed(6)}, {mapContext.lng.toFixed(6)}
        </span>
        {renderContextActionButton('center', centerMapContext)}
        {renderContextActionButton('copyLatLng', copyMapContextLatLng)}
        {renderContextActionButton('copyIntelUrl', copyMapContextUrl)}
      </div>
    </div>
  );
}
