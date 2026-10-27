import type {IitcIrisHighlighterSettings, IitcIrisInteractionUpdateTimingDiagnostics,
  IitcIrisLayerSettings, IitcIrisLayerUpdateTimingDiagnostics, IitcIrisRenderEntities} from '../messages';
import {DEFAULT_LAYER_SETTINGS} from './layers/layer-registry';
import {DEFAULT_HIGHLIGHTER_ID} from './layers/highlighter-registry';
import {getLayerUpdatePlan} from './layers/layer-update-routing';
import type {createMapRenderer} from './entities/map-renderer';
import type {createMapDiagnostics} from './map-diagnostics';

type MapDiagnostics = ReturnType<typeof createMapDiagnostics>;
interface MapSettingsRuntimeOptions {
  getEntities: () => IitcIrisRenderEntities | undefined;
  renderEntities: ReturnType<typeof createMapRenderer>['renderEntities'];
  getSecondaryEntityRenderUpdate: ReturnType<typeof createMapRenderer>['getSecondaryEntityRenderUpdate'];
  refreshPortalMarkerStylesForHighlighter: () => boolean;
  renderLatestTileDebug: () => void;
  renderIitcDrawTools: () => void;
  renderPlayerTracker: () => void;
  schedulePlayerTrackerRefresh: () => void;
  recordInteractionUpdateDiagnostics: MapDiagnostics['recordInteractionUpdateDiagnostics'];
  recordLayerUpdateTiming: MapDiagnostics['recordLayerUpdateTiming'];
  scheduleInteractionFrameDiagnostics: MapDiagnostics['scheduleInteractionFrameDiagnostics'];
}

interface MapSettingsRuntime {
  getLayerSettings: () => IitcIrisLayerSettings;
  getHighlighterSettings: () => IitcIrisHighlighterSettings;
  applyLayerSettings: (next: IitcIrisLayerSettings, sentAt?: number) => void;
  applyHighlighterSettings: (next: IitcIrisHighlighterSettings, sentAt?: number) => void;
}

/** Own overlay/highlighter settings and their ordered render updates across map replacement. */
export function createMapSettingsRuntime(options: MapSettingsRuntimeOptions): MapSettingsRuntime {
  const {getEntities, renderEntities, getSecondaryEntityRenderUpdate, refreshPortalMarkerStylesForHighlighter,
    renderLatestTileDebug, renderIitcDrawTools, renderPlayerTracker, schedulePlayerTrackerRefresh,
    recordInteractionUpdateDiagnostics, recordLayerUpdateTiming, scheduleInteractionFrameDiagnostics} = options;
  let layerSettings: IitcIrisLayerSettings = DEFAULT_LAYER_SETTINGS;
  let highlighterSettings: IitcIrisHighlighterSettings = {active: DEFAULT_HIGHLIGHTER_ID};

  function roundTimingMs(value: number): number {
    return Math.round(value * 10) / 10;
  }

  function applyLayerSettings(next: IitcIrisLayerSettings, sentAt?: number): void {
    const layerUpdateStartedAt = performance.now();
    const previousLayerSettings = layerSettings;
    layerSettings = next;
    const latestEntities = getEntities();
    const layerUpdatePlan = getLayerUpdatePlan(previousLayerSettings, layerSettings);
    const layerUpdateTiming: IitcIrisLayerUpdateTimingDiagnostics = {
      changedKeys: layerUpdatePlan.changedKeys.map(String),
    };
    if (sentAt !== undefined) {
      layerUpdateTiming.dispatchDelayMs = roundTimingMs(Math.max(0, layerUpdateStartedAt - sentAt));
    }

    if (latestEntities && layerUpdatePlan.renderEntities) {
      renderEntities(latestEntities, {
        previousLayerSettings,
        changedLayerKeys: layerUpdatePlan.changedKeys,
        secondaryUpdate: getSecondaryEntityRenderUpdate(layerUpdatePlan.changedKeys),
        timing: layerUpdateTiming,
      });
    }
    if (layerUpdatePlan.renderTileDebug) renderLatestTileDebug();
    if (layerUpdatePlan.renderDrawTools) renderIitcDrawTools();
    if (layerUpdatePlan.renderPlayerTracker) {
      renderPlayerTracker();
      schedulePlayerTrackerRefresh();
    }
    layerUpdateTiming.totalMs = roundTimingMs(performance.now() - layerUpdateStartedAt);
    const interactionUpdate: IitcIrisInteractionUpdateTimingDiagnostics = {
      kind: 'layer',
      at: Date.now(),
      ...layerUpdateTiming,
    };
    recordInteractionUpdateDiagnostics(interactionUpdate);
    recordLayerUpdateTiming(layerUpdateTiming);
    scheduleInteractionFrameDiagnostics(interactionUpdate, layerUpdateStartedAt, sentAt, layerUpdateTiming);
  }

  function applyHighlighterSettings(next: IitcIrisHighlighterSettings, sentAt?: number): void {
    const highlighterUpdateStartedAt = performance.now();
    highlighterSettings = next;
    const highlighterUpdateTiming: IitcIrisInteractionUpdateTimingDiagnostics = {
      kind: 'highlighter',
      at: Date.now(),
      activeHighlighter: highlighterSettings.active,
      renderPath: 'none',
    };
    if (sentAt !== undefined) {
      highlighterUpdateTiming.dispatchDelayMs = roundTimingMs(Math.max(0, highlighterUpdateStartedAt - sentAt));
    }
    const latestEntities = getEntities();
    if (latestEntities) {
      const renderStartedAt = performance.now();
      const refreshedExistingStyles = refreshPortalMarkerStylesForHighlighter();
      if (refreshedExistingStyles) {
        highlighterUpdateTiming.renderPath = 'style-refresh';
      } else {
        renderEntities(latestEntities);
        highlighterUpdateTiming.renderPath = 'full-render';
      }
      highlighterUpdateTiming.renderEntitiesMs = roundTimingMs(performance.now() - renderStartedAt);
    }
    highlighterUpdateTiming.totalMs = roundTimingMs(performance.now() - highlighterUpdateStartedAt);
    recordInteractionUpdateDiagnostics(highlighterUpdateTiming);
    scheduleInteractionFrameDiagnostics(highlighterUpdateTiming, highlighterUpdateStartedAt, sentAt);
  }

  return {getLayerSettings: (): IitcIrisLayerSettings => layerSettings, getHighlighterSettings: (): IitcIrisHighlighterSettings => highlighterSettings,
    applyLayerSettings, applyHighlighterSettings};
}
