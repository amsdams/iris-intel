import {h} from 'preact';
import {IitcIrisSystemControlsPanel} from './system-controls-panel';
import {IitcIrisSystemDiagnosticsPanel, type IitcIrisInnerStatusView} from './system-diagnostics-panel';
import {
  type CameraState,
  type EntityFetchState,
} from './content-message-adapter';
import {
  DATA_SOURCE_OPTIONS,
  VIEW_PRESETS,
} from './content-storage-settings';
import {
  type ScenarioRun,
} from './content-scenarios';
import {
  type IitcIrisLifecycleSettings,
  type IitcIrisRequestDiagnostics,
} from './messages';
import {
  type IitcMapDataPlan,
} from '@iris/iitc-core';

export interface IitcIrisSystemPanelContainerProps {
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

  activeScenarioRun: ScenarioRun | null;
  canPan: boolean;
  captureScenarioSnapshot: (label: string) => void;
  clearScenarioRuns: () => void;
  copyDockText: () => void;
  copyIntelUrl: () => void;
  copyScenarioRun: (run: ScenarioRun) => void;
  copyStatus: string;
  dataSourceId: string;
  finishScenarioRun: () => void;
  jumpToPreset: (preset: typeof VIEW_PRESETS[number]) => void;
  jumpToViewInput: () => void;
  latestScenarioRun: ScenarioRun | null;
  lifecycleSettings: IitcIrisLifecycleSettings;
  mapFocusMode: boolean;
  panScenarioSouth: () => void;
  scenarioExpectedSteps: readonly string[];
  scenarioProgressLabels: Set<string>;
  scenarioProgressRun: ScenarioRun | null;
  scenarioRuns: ScenarioRun[];
  scenarioSnapCount: number;
  scenarioStatus: string;
  setDataSource: (id: string) => void;
  setLifecycleSettings: (action: (current: IitcIrisLifecycleSettings) => IitcIrisLifecycleSettings) => void;
  setMapFocusMode: (action: (current: boolean) => boolean) => void;
  setShortcutsEnabled: (action: (current: boolean) => boolean) => void;
  setViewInput: (value: string) => void;
  shortcutsEnabled: boolean;
  startScenarioRun: (name: string, overrides: Partial<IitcIrisLifecycleSettings>) => void;
  viewInput: string;
  viewInputStatus: string;
}

export function IitcIrisSystemPanelContainer(props: IitcIrisSystemPanelContainerProps): h.JSX.Element {
  const {
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
    activeScenarioRun,
    canPan,
    captureScenarioSnapshot,
    clearScenarioRuns,
    copyDockText,
    copyIntelUrl,
    copyScenarioRun,
    copyStatus,
    dataSourceId,
    finishScenarioRun,
    jumpToPreset,
    jumpToViewInput,
    latestScenarioRun,
    lifecycleSettings,
    mapFocusMode,
    panScenarioSouth,
    scenarioExpectedSteps,
    scenarioProgressLabels,
    scenarioProgressRun,
    scenarioRuns,
    scenarioSnapCount,
    scenarioStatus,
    setDataSource,
    setLifecycleSettings,
    setMapFocusMode,
    setShortcutsEnabled,
    setViewInput,
    shortcutsEnabled,
    startScenarioRun,
    viewInput,
    viewInputStatus,
  } = props;

  return (
    <aside className="iitc-iris-system-panel" aria-label="System controls">
      <div className="iitc-iris-panel-topbar">
        <span className="iitc-iris-selected-title">System</span>
        <span className="iitc-iris-panel-header-actions">
          <span className="iitc-iris-status">UI and diagnostics</span>
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
        activeScenarioRun={activeScenarioRun}
        canPan={canPan}
        captureScenarioSnapshot={captureScenarioSnapshot}
        clearScenarioRuns={clearScenarioRuns}
        copyDockText={copyDockText}
        copyIntelUrl={copyIntelUrl}
        copyScenarioRun={() => {
          if (latestScenarioRun) copyScenarioRun(latestScenarioRun);
        }}
        copyStatus={copyStatus}
        dataSourceId={dataSourceId}
        dataSourceOptions={DATA_SOURCE_OPTIONS}
        finishScenarioRun={finishScenarioRun}
        jumpToPreset={jumpToPreset}
        jumpToViewInput={jumpToViewInput}
        latestScenarioRun={latestScenarioRun}
        lifecycleSettings={lifecycleSettings}
        logoutIntel={logoutIntel}
        mapFocusMode={mapFocusMode}
        panScenarioSouth={panScenarioSouth}
        scenarioExpectedSteps={scenarioExpectedSteps}
        scenarioProgressLabels={scenarioProgressLabels}
        scenarioProgressRun={scenarioProgressRun}
        scenarioRuns={scenarioRuns}
        scenarioSnapCount={scenarioSnapCount}
        scenarioStatus={scenarioStatus}
        setDataSource={setDataSource}
        setLifecycleSettings={setLifecycleSettings}
        setMapFocusMode={setMapFocusMode}
        setShortcutsEnabled={setShortcutsEnabled}
        setViewInput={setViewInput}
        shortcutsEnabled={shortcutsEnabled}
        startScenarioRun={startScenarioRun}
        viewInput={viewInput}
        viewInputStatus={viewInputStatus}
        viewPresets={VIEW_PRESETS}
      />
    </aside>
  );
}
