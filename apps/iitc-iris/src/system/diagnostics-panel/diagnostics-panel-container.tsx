import {h} from 'preact';
import '../../ui/panel/panel.css';
import {IitcIrisSystemControlsPanel} from './system-controls-panel';
import {IitcIrisSystemDiagnosticsPanel, type IitcIrisInnerStatusView} from './system-diagnostics-panel';
import {
  type CameraState,
  type EntityFetchState,
} from '../../shell/message-adapter';
import {
  type IitcIrisLifecycleSettings,
  type IitcIrisRequestDiagnostics,
} from '../../messages';
import {
  type IitcMapDataPlan,
} from '@iris/iitc-core';
import {StatusText} from '../../ui/status-text';
import {PanelTitle} from '../../ui/panel';
import {ClearButton} from '../../ui/clear-button';

export interface IitcIrisDiagnosticsPanelContainerProps {
  closeDiagnostics: () => void;
  requestDiagnostics: IitcIrisRequestDiagnostics;
  camera: CameraState;
  debugDockVisible: boolean;
  detailOverlaysActive: boolean;
  entityFetch: EntityFetchState;
  innerStatus: IitcIrisInnerStatusView;
  plan: IitcMapDataPlan | null;
  requestBatches: number[];
  status: string;
  summaryMode: string;
  clearPortalSelection: () => void;
  formatRenderMutationSummary: (mutation: EntityFetchState['renderMutation']) => string;
  formatSelectedPortalLabel: () => string | null;
  openIntelLogin: () => void;
  logoutIntel: () => void;
  toggleDebugDock: () => void;

  copyDockText: () => void;
  copyIntelUrl: () => void;
  copyStatus: string;
  jumpToViewInput: () => void;
  lifecycleSettings: IitcIrisLifecycleSettings;
  mapFocusMode: boolean;
  setLifecycleSettings: (action: (current: IitcIrisLifecycleSettings) => IitcIrisLifecycleSettings) => void;
  setMapFocusMode: (action: (current: boolean) => boolean) => void;
  setShortcutsEnabled: (action: (current: boolean) => boolean) => void;
  setViewInput: (value: string) => void;
  shortcutsEnabled: boolean;
  viewInput: string;
  viewInputStatus: string;
}

export function IitcIrisDiagnosticsPanelContainer(props: IitcIrisDiagnosticsPanelContainerProps): h.JSX.Element {
  const {
    closeDiagnostics,
    requestDiagnostics,
    camera,
    debugDockVisible,
    detailOverlaysActive,
    entityFetch,
    innerStatus,
    plan,
    requestBatches,
    status,
    summaryMode,
    clearPortalSelection,
    formatRenderMutationSummary,
    formatSelectedPortalLabel,
    openIntelLogin,
    logoutIntel,
    toggleDebugDock,
    copyDockText,
    copyIntelUrl,
    copyStatus,
    jumpToViewInput,
    lifecycleSettings,
    mapFocusMode,
    setLifecycleSettings,
    setMapFocusMode,
    setShortcutsEnabled,
    setViewInput,
    shortcutsEnabled,
    viewInput,
    viewInputStatus,
  } = props;

  return (
    <aside className="iitc-iris-system-panel" aria-label="System controls">
      <div className="iitc-iris-panel-topbar">
        <PanelTitle>System</PanelTitle>
        <span className="iitc-iris-panel-header-actions">
          <StatusText>UI and diagnostics</StatusText>
          <ClearButton onClick={closeDiagnostics} title="Close diagnostics" aria-label="Close diagnostics" />
        </span>
      </div>
      <IitcIrisSystemDiagnosticsPanel
        activeByEndpoint={requestDiagnostics.activeByEndpoint}
        camera={camera}
        debugDockVisible={debugDockVisible}
        detailOverlaysActive={detailOverlaysActive}
        entityFetch={entityFetch}
        innerStatus={innerStatus}
        plan={plan}
        requestBatches={requestBatches}
        selectedPortalLabel={formatSelectedPortalLabel()}
        status={status}
        summaryMode={summaryMode}
        clearPortalSelection={clearPortalSelection}
        formatRenderMutationSummary={formatRenderMutationSummary}
        openIntelLogin={openIntelLogin}
        toggleDebugDock={toggleDebugDock}
      />
      <IitcIrisSystemControlsPanel
        copyDockText={copyDockText}
        copyIntelUrl={copyIntelUrl}
        copyStatus={copyStatus}
        jumpToViewInput={jumpToViewInput}
        lifecycleSettings={lifecycleSettings}
        logoutIntel={logoutIntel}
        mapFocusMode={mapFocusMode}
        setLifecycleSettings={setLifecycleSettings}
        setMapFocusMode={setMapFocusMode}
        setShortcutsEnabled={setShortcutsEnabled}
        setViewInput={setViewInput}
        shortcutsEnabled={shortcutsEnabled}
        viewInput={viewInput}
        viewInputStatus={viewInputStatus}
      />
    </aside>
  );
}
