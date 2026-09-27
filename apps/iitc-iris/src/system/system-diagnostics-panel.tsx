import {h} from 'preact';
import type {IitcMapDataPlan} from '@iris/iitc-core';
import type {CameraState, EntityFetchState} from '../shell/content-message-adapter';
import {formatElapsedSeconds} from '../ui-status';
import {ClearButton} from '../ui/clear-button';
import {ControlRow} from '../ui/control-row';
import {Section} from '../ui/section';
import {StatusText} from '../ui/status-text';

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
    <Section titleHeading="Status">
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
            <ClearButton onClick={props.clearPortalSelection} title="Clear selected portal" aria-label="Clear selected portal" />
          </>
        )}
        {props.entityFetch.collision && <span className="failed-request">old IRIS active</span>}
        {props.entityFetch.authRequired && (
          <button className="iitc-iris-login iitc-iris-innerstatus-login" type="button" onClick={props.openIntelLogin} title="Open Intel login">
            Intel Login
          </button>
        )}
      </div>
    </Section>
    <Section titleHeading="Debug display">
      <ControlRow>
        <button
          className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${props.debugDockVisible ? 'iitc-iris-layer-toggle-active' : ''}`}
          type="button"
          onClick={props.toggleDebugDock}
          title="Show or hide debug diagnostic rows"
          aria-pressed={props.debugDockVisible}
        >
          Debug
        </button>
      </ControlRow>
    </Section>
    {props.debugDockVisible && <Section className="iitc-iris-system-debug" titleHeading="Map diagnostics">
      <div className="iitc-iris-dock-row iitc-iris-debug-row">
        <StatusText>{props.status}</StatusText>
        <StatusText>z {props.camera.zoom.toFixed(2)}</StatusText>
        <StatusText>data z {props.plan?.dataZoom ?? '-'}</StatusText>
        <StatusText>mode {props.summaryMode}</StatusText>
        <StatusText>detail {props.detailOverlaysActive ? 'on' : 'off'}</StatusText>
        <StatusText>tiles {props.plan?.tiles.length ?? '-'}</StatusText>
        <StatusText>x {props.plan ? `${props.plan.xRange[0]}-${props.plan.xRange[1]}` : '-'}</StatusText>
        <StatusText>y {props.plan ? `${props.plan.yRange[0]}-${props.plan.yRange[1]}` : '-'}</StatusText>
        <StatusText>batch {props.requestBatches[0] ?? 0}</StatusText>
        {props.entityFetch.collision && <StatusText className="iitc-iris-warning">old IRIS active</StatusText>}
        {props.entityFetch.authRequired && (
          <button className="iitc-iris-login" type="button" onClick={props.openIntelLogin} title="Open Intel login">
            Intel Login
          </button>
        )}
      </div>
      <div className="iitc-iris-dock-row iitc-iris-debug-row">
        <StatusText>{props.entityFetch.status}</StatusText>
        <StatusText>src {props.entityFetch.entitySource}</StatusText>
        <StatusText>p {props.entityFetch.portals}</StatusText>
        <StatusText>real {props.entityFetch.realPortals}</StatusText>
        <StatusText>ph {props.entityFetch.placeholderPortals}</StatusText>
        <StatusText>orn {props.entityFetch.ornamentPortals}</StatusText>
        <StatusText>ornDraw {props.entityFetch.drawnOrnamentMarkers}</StatusText>
        <StatusText>ornHide {props.entityFetch.hiddenOrnamentMarkers}</StatusText>
        <StatusText>art {props.entityFetch.artifactPortals}</StatusText>
        <StatusText>artDraw {props.entityFetch.drawnArtifactMarkers}</StatusText>
        <StatusText>artFetch {props.entityFetch.artifactFetchStatus}:{props.entityFetch.artifactFetchPortalCount}</StatusText>
        <StatusText>lvl {props.entityFetch.levelLabels}</StatusText>
        <StatusText>dmg {props.entityFetch.damagedPortals}</StatusText>
        <StatusText>l {props.entityFetch.links}</StatusText>
        <StatusText>f {props.entityFetch.fields}</StatusText>
        <StatusText className="iitc-iris-compare" title={props.entityFetch.renderMutation ? JSON.stringify(props.entityFetch.renderMutation) : undefined}>
          {props.formatRenderMutationSummary(props.entityFetch.renderMutation)}
        </StatusText>
        <StatusText className="iitc-iris-compare">compare vp P/L/F {props.entityFetch.viewportPortals}/{props.entityFetch.viewportLinks}/{props.entityFetch.viewportFields}</StatusText>
        <StatusText>rt {props.entityFetch.returnedTiles}/{props.entityFetch.requestedTiles}</StatusText>
        <StatusText>nt {props.entityFetch.nonEmptyTiles}</StatusText>
        {props.entityFetch.elapsedMs !== null && <StatusText>in {formatElapsedSeconds(props.entityFetch.elapsedMs)}s</StatusText>}
        {props.entityFetch.timing?.initialMs !== undefined && <StatusText>init {formatElapsedSeconds(props.entityFetch.timing.initialMs)}s</StatusText>}
        {props.entityFetch.timing?.retryMs !== undefined && <StatusText>retryT {formatElapsedSeconds(props.entityFetch.timing.retryMs)}s</StatusText>}
        {props.entityFetch.retryRequests > 0 && <StatusText>retry {props.entityFetch.retryRequests}</StatusText>}
        {props.entityFetch.playerTracker && <StatusText>pt {props.entityFetch.playerTracker.players}/{props.entityFetch.playerTracker.events}</StatusText>}
        {props.entityFetch.selectedPortal && props.selectedPortalLabel && (
          <>
            <StatusText className="iitc-iris-compare">sel {props.selectedPortalLabel}</StatusText>
            <button className="iitc-iris-preset" type="button" onClick={props.clearPortalSelection} title="Clear selected portal">Clear Sel</button>
          </>
        )}
      </div>
    </Section>}
  </>;
}
