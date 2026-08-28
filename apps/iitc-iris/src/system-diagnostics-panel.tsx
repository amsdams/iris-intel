import {h} from 'preact';
import type {IitcMapDataPlan} from '@iris/iitc-core';
import type {CameraState, EntityFetchState} from './content-message-adapter';
import {formatElapsedSeconds} from './ui-status';

export interface IitcIrisInnerStatusView {
  portalText: string;
  mapText: string;
  mapTitle: string;
  progressPercent: number | null;
  activeRequests: number;
  failedRequests: number;
}

export interface IitcIrisSystemDiagnosticsPanelProps {
  activeByEndpoint: Record<string, number>;
  camera: CameraState;
  debugDockVisible: boolean;
  detailOverlaysActive: boolean;
  entityFetch: EntityFetchState;
  innerStatus: IitcIrisInnerStatusView;
  plan: IitcMapDataPlan | null;
  requestBatches: number[];
  selectedPortalLabel: string | null;
  status: string;
  summaryMode: string;
  clearPortalSelection: () => void;
  formatRenderMutationSummary: (mutation: EntityFetchState['renderMutation']) => string;
  openIntelLogin: () => void;
  toggleDebugDock: () => void;
}

export function IitcIrisSystemDiagnosticsPanel(props: IitcIrisSystemDiagnosticsPanelProps): h.JSX.Element {
  return <>
    <div className="iitc-iris-map-controls-section">
      <span className="iitc-iris-status">Status</span>
      <div id="iitc-iris-innerstatus" className="iitc-iris-innerstatus">
        <span className="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more.">{props.innerStatus.portalText}</span>
        <span className="map">
          <b>map</b>:{' '}
          <span className="help" title={props.innerStatus.mapTitle}>{props.innerStatus.mapText}</span>
          {props.innerStatus.progressPercent !== null && ` ${props.innerStatus.progressPercent}%`}
        </span>
        {props.innerStatus.activeRequests > 0 && (
          <span title={Object.entries(props.activeByEndpoint).map(([endpoint, count]) => `${endpoint}: ${count}`).join('\n')}>
            {props.innerStatus.activeRequests} requests
          </span>
        )}
        {props.innerStatus.failedRequests > 0 && <span className="failed-request">{props.innerStatus.failedRequests} failed</span>}
        {props.entityFetch.selectedPortal && props.selectedPortalLabel && (
          <>
            <span className="selected-portal" title={props.entityFetch.selectedPortal.guid}>
              selected {props.selectedPortalLabel}
            </span>
            <button className="iitc-iris-clear-selection" type="button" onClick={props.clearPortalSelection} title="Clear selected portal" aria-label="Clear selected portal">X</button>
          </>
        )}
        {props.entityFetch.collision && <span className="failed-request">old IRIS active</span>}
        {props.entityFetch.authRequired && (
          <button className="iitc-iris-login iitc-iris-innerstatus-login" type="button" onClick={props.openIntelLogin} title="Open Intel login">
            Intel Login
          </button>
        )}
      </div>
    </div>
    <div className="iitc-iris-map-controls-section">
      <span className="iitc-iris-status">Debug display</span>
      <div className="iitc-iris-map-control-row">
        <button
          className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${props.debugDockVisible ? 'iitc-iris-layer-toggle-active' : ''}`}
          type="button"
          onClick={props.toggleDebugDock}
          title="Show or hide debug diagnostic rows"
          aria-pressed={props.debugDockVisible}
        >
          Debug
        </button>
      </div>
    </div>
    {props.debugDockVisible && <div className="iitc-iris-map-controls-section iitc-iris-system-debug">
      <span className="iitc-iris-status">Map diagnostics</span>
      <div className="iitc-iris-dock-row iitc-iris-debug-row">
        <span className="iitc-iris-status">{props.status}</span>
        <span className="iitc-iris-status">z {props.camera.zoom.toFixed(2)}</span>
        <span className="iitc-iris-status">data z {props.plan?.dataZoom ?? '-'}</span>
        <span className="iitc-iris-status">mode {props.summaryMode}</span>
        <span className="iitc-iris-status">detail {props.detailOverlaysActive ? 'on' : 'off'}</span>
        <span className="iitc-iris-status">tiles {props.plan?.tiles.length ?? '-'}</span>
        <span className="iitc-iris-status">x {props.plan ? `${props.plan.xRange[0]}-${props.plan.xRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">y {props.plan ? `${props.plan.yRange[0]}-${props.plan.yRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">batch {props.requestBatches[0] ?? 0}</span>
        {props.entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
        {props.entityFetch.authRequired && (
          <button className="iitc-iris-login" type="button" onClick={props.openIntelLogin} title="Open Intel login">
            Intel Login
          </button>
        )}
      </div>
      <div className="iitc-iris-dock-row iitc-iris-debug-row">
        <span className="iitc-iris-status">{props.entityFetch.status}</span>
        <span className="iitc-iris-status">src {props.entityFetch.entitySource}</span>
        <span className="iitc-iris-status">p {props.entityFetch.portals}</span>
        <span className="iitc-iris-status">real {props.entityFetch.realPortals}</span>
        <span className="iitc-iris-status">ph {props.entityFetch.placeholderPortals}</span>
        <span className="iitc-iris-status">orn {props.entityFetch.ornamentPortals}</span>
        <span className="iitc-iris-status">ornDraw {props.entityFetch.drawnOrnamentMarkers}</span>
        <span className="iitc-iris-status">ornHide {props.entityFetch.hiddenOrnamentMarkers}</span>
        <span className="iitc-iris-status">art {props.entityFetch.artifactPortals}</span>
        <span className="iitc-iris-status">artDraw {props.entityFetch.drawnArtifactMarkers}</span>
        <span className="iitc-iris-status">artFetch {props.entityFetch.artifactFetchStatus}:{props.entityFetch.artifactFetchPortalCount}</span>
        <span className="iitc-iris-status">lvl {props.entityFetch.levelLabels}</span>
        <span className="iitc-iris-status">dmg {props.entityFetch.damagedPortals}</span>
        <span className="iitc-iris-status">l {props.entityFetch.links}</span>
        <span className="iitc-iris-status">f {props.entityFetch.fields}</span>
        <span className="iitc-iris-status iitc-iris-compare" title={props.entityFetch.renderMutation ? JSON.stringify(props.entityFetch.renderMutation) : undefined}>
          {props.formatRenderMutationSummary(props.entityFetch.renderMutation)}
        </span>
        <span className="iitc-iris-status iitc-iris-compare">compare vp P/L/F {props.entityFetch.viewportPortals}/{props.entityFetch.viewportLinks}/{props.entityFetch.viewportFields}</span>
        <span className="iitc-iris-status">rt {props.entityFetch.returnedTiles}/{props.entityFetch.requestedTiles}</span>
        <span className="iitc-iris-status">nt {props.entityFetch.nonEmptyTiles}</span>
        {props.entityFetch.elapsedMs !== null && <span className="iitc-iris-status">in {formatElapsedSeconds(props.entityFetch.elapsedMs)}s</span>}
        {props.entityFetch.timing?.initialMs !== undefined && <span className="iitc-iris-status">init {formatElapsedSeconds(props.entityFetch.timing.initialMs)}s</span>}
        {props.entityFetch.timing?.retryMs !== undefined && <span className="iitc-iris-status">retryT {formatElapsedSeconds(props.entityFetch.timing.retryMs)}s</span>}
        {props.entityFetch.retryRequests > 0 && <span className="iitc-iris-status">retry {props.entityFetch.retryRequests}</span>}
        {props.entityFetch.playerTracker && <span className="iitc-iris-status">pt {props.entityFetch.playerTracker.players}/{props.entityFetch.playerTracker.events}</span>}
        {props.entityFetch.selectedPortal && props.selectedPortalLabel && (
          <>
            <span className="iitc-iris-status iitc-iris-compare">sel {props.selectedPortalLabel}</span>
            <button className="iitc-iris-preset" type="button" onClick={props.clearPortalSelection} title="Clear selected portal">Clear Sel</button>
          </>
        )}
      </div>
    </div>}
  </>;
}
