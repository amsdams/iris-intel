import {h} from 'preact';
import type {ScenarioRun} from './content-scenarios';
import type {IitcIrisLifecycleSettings} from './messages';

export interface ViewPresetOption {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface DataSourceOption {
  id: string;
  label: string;
  title: string;
  mode: 'live' | 'fixture';
  fixturePath?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}

interface IitcIrisSystemControlsPanelProps {
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (action: (current: boolean) => boolean) => void;
  mapFocusMode: boolean;
  setMapFocusMode: (action: (current: boolean) => boolean) => void;
  copyDockText: () => void;
  copyIntelUrl: () => void;
  copyStatus: string;
  viewPresets: readonly ViewPresetOption[];
  jumpToPreset: (preset: ViewPresetOption) => void;
  jumpToViewInput: () => void;
  viewInput: string;
  setViewInput: (value: string) => void;
  viewInputStatus: string;
  lifecycleSettings: IitcIrisLifecycleSettings;
  setLifecycleSettings: (action: (current: IitcIrisLifecycleSettings) => IitcIrisLifecycleSettings) => void;
  activeScenarioRun: ScenarioRun | null;
  latestScenarioRun: ScenarioRun | null;
  scenarioRuns: ScenarioRun[];
  scenarioSnapCount: number;
  scenarioStatus: string;
  startScenarioRun: (name: string, overrides: Partial<IitcIrisLifecycleSettings>) => void;
  panScenarioSouth: () => void;
  canPan: boolean;
  captureScenarioSnapshot: (label: string) => void;
  finishScenarioRun: () => void;
  copyScenarioRun: () => void;
  clearScenarioRuns: () => void;
  scenarioProgressRun: ScenarioRun | null;
  scenarioExpectedSteps: readonly string[];
  scenarioProgressLabels: Set<string>;
  dataSourceOptions: readonly DataSourceOption[];
  dataSourceId: string;
  setDataSource: (id: string) => void;
}

export function IitcIrisSystemControlsPanel({
  shortcutsEnabled,
  setShortcutsEnabled,
  mapFocusMode,
  setMapFocusMode,
  copyDockText,
  copyIntelUrl,
  copyStatus,
  viewPresets,
  jumpToPreset,
  jumpToViewInput,
  viewInput,
  setViewInput,
  viewInputStatus,
  lifecycleSettings,
  setLifecycleSettings,
  activeScenarioRun,
  latestScenarioRun,
  scenarioRuns,
  scenarioSnapCount,
  scenarioStatus,
  startScenarioRun,
  panScenarioSouth,
  canPan,
  captureScenarioSnapshot,
  finishScenarioRun,
  copyScenarioRun,
  clearScenarioRuns,
  scenarioProgressRun,
  scenarioExpectedSteps,
  scenarioProgressLabels,
  dataSourceOptions,
  dataSourceId,
  setDataSource,
}: IitcIrisSystemControlsPanelProps): h.JSX.Element {
  return (
    <>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Interaction</span>
        <div className="iitc-iris-map-control-row">
          <button
            className={`iitc-iris-layer-toggle ${shortcutsEnabled ? 'iitc-iris-layer-toggle-active' : ''}`}
            type="button"
            onClick={() => setShortcutsEnabled((current) => !current)}
            title="Enable plain keyboard shortcuts when focus is not in a text field"
            aria-pressed={shortcutsEnabled}
          >
            Shortcuts
          </button>
          <button
            className={`iitc-iris-layer-toggle ${mapFocusMode ? 'iitc-iris-layer-toggle-active' : ''}`}
            type="button"
            onClick={() => setMapFocusMode((current) => !current)}
            title="Auto-close panels after navigation actions that move the map"
            aria-pressed={mapFocusMode}
          >
            Map Focus
          </button>
          <span className="iitc-iris-status">{shortcutsEnabled ? 'keys on' : 'keys off'}</span>
          <span className="iitc-iris-status">{mapFocusMode ? 'auto close' : 'stay open'}</span>
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Copy/export</span>
        <div className="iitc-iris-map-control-row">
          <button className="iitc-iris-portal-action" type="button" onClick={copyDockText} title="Copy JSON diagnostics">JSON</button>
          <button className="iitc-iris-portal-action" type="button" onClick={copyIntelUrl} title="Copy current view as an Intel URL">URL</button>
          {copyStatus && <span className="iitc-iris-status">{copyStatus}</span>}
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Presets</span>
        <div className="iitc-iris-map-control-row">
          {viewPresets.map((preset) => (
            <button
              key={preset.id}
              className="iitc-iris-preset"
              type="button"
              onClick={() => jumpToPreset(preset)}
              title={`${preset.label} ${preset.lat.toFixed(6)},${preset.lng.toFixed(6)}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <form
          className="iitc-iris-jump"
          onSubmit={(event) => {
            event.preventDefault();
            jumpToViewInput();
          }}
        >
          <input
            className="iitc-iris-jump-input"
            type="text"
            value={viewInput}
            onInput={(event) => setViewInput((event.currentTarget as HTMLInputElement).value)}
            placeholder="lat,lng,z or Intel URL"
            title="Paste lat,lng,z or an Intel URL with ll, pll, and optional z"
          />
          <button className="iitc-iris-preset" type="submit">Jump</button>
          {viewInputStatus && <span className="iitc-iris-status">{viewInputStatus}</span>}
        </form>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Lifecycle</span>
        <div className="iitc-iris-map-control-row">
          <button
            className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${lifecycleSettings.iitcMovementDelay ? 'iitc-iris-layer-toggle-active' : ''}`}
            type="button"
            onClick={() => setLifecycleSettings((current) => ({...current, iitcMovementDelay: !current.iitcMovementDelay}))}
            title="Compare current fast refresh with IITC-style map movement and download timing"
            aria-pressed={lifecycleSettings.iitcMovementDelay}
          >
            IITC Delay
          </button>
          <span className="iitc-iris-status">{lifecycleSettings.iitcMovementDelay ? 'IITC timing' : 'fast move'}</span>
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Scenarios</span>
        <div className="iitc-iris-map-control-row">
          <button
            className="iitc-iris-preset"
            type="button"
            disabled={activeScenarioRun !== null}
            onClick={() => startScenarioRun('fast-pan', {iitcMovementDelay: false})}
            title="Start a fast-refresh scenario and capture the previous state"
          >
            Start Fast
          </button>
          <button
            className="iitc-iris-preset"
            type="button"
            disabled={activeScenarioRun !== null}
            onClick={() => startScenarioRun('iitc-delay-pan', {iitcMovementDelay: true})}
            title="Start an IITC-delay scenario and capture the previous state"
          >
            Start Delay
          </button>
          <button
            className="iitc-iris-preset"
            type="button"
            disabled={!canPan || activeScenarioRun === null}
            onClick={panScenarioSouth}
            title="Capture the current diagnostics before panning south, then pan south"
          >
            Snap Before Pan S
          </button>
          <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={() => captureScenarioSnapshot('reload')} title="Capture the current diagnostics after the selected scenario mode has refreshed">Snap Reload</button>
          <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={() => captureScenarioSnapshot('in-progress')} title="Capture the current diagnostics as the in-progress point">Snap Prog</button>
          <button className="iitc-iris-preset" type="button" disabled={activeScenarioRun === null} onClick={finishScenarioRun} title="Capture the final diagnostics and finish the active scenario run">Snap Done</button>
          <button className="iitc-iris-portal-action" type="button" onClick={copyScenarioRun} title="Copy all scenario runs as JSON">Copy Runs</button>
          <button className="iitc-iris-preset" type="button" onClick={clearScenarioRuns}>Clear</button>
          {activeScenarioRun
            ? <span className="iitc-iris-status iitc-iris-panel-state is-loading">{activeScenarioRun.name}: running</span>
            : latestScenarioRun
              ? <span className="iitc-iris-status iitc-iris-panel-state is-ready">{scenarioRuns.length} runs, {scenarioSnapCount} snaps</span>
              : <span className="iitc-iris-status">no run</span>}
          {scenarioStatus && <span className="iitc-iris-status">{scenarioStatus}</span>}
        </div>
        {scenarioProgressRun && (
          <div className="iitc-iris-scenario-progress" title={`${scenarioProgressRun.name} ${scenarioProgressRun.status}`}>
            {scenarioExpectedSteps.map((label) => {
              const doneLabel = label === 'done'
                ? scenarioProgressLabels.has('done') || scenarioProgressLabels.has('done-active')
                : scenarioProgressLabels.has(label);
              return (
                <span className={doneLabel ? 'is-done' : ''} key={label}>
                  {label === 'before-pan-south' ? 'pan-south' : label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Data source</span>
        <div className="iitc-iris-map-control-row">
          {dataSourceOptions.map((option) => (
            <button
              key={option.id}
              className={`iitc-iris-layer-toggle iitc-iris-source-toggle ${dataSourceId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => setDataSource(option.id)}
              title={option.title}
              aria-pressed={dataSourceId === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
