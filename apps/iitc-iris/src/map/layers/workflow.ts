import {useCallback, useEffect, useRef, useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisBaseLayerId, IitcIrisHighlighterSettings, IitcIrisLayerSettings,
  IitcIrisMessage, IitcIrisPortalHighlighterId} from '../../messages';
import {
  loadStoredBaseLayerId,
  loadStoredHighlighterSettings,
  loadStoredLayerSettings,
  storeHighlighterSettings,
  storeLayerSettings,
} from '../../shell/storage-settings';
import {
  buildHighlighterSettingsMessage,
  buildHighlighterSettingsValue,
  buildLayerSettingsMessage,
  calculateToggledLayerSettings,
} from './actions';
import type {IitcIrisBooleanLayerSettingKey} from './layer-registry';

interface LayerSettingsWorkflow {
  baseLayerId: IitcIrisBaseLayerId;
  layerSettings: IitcIrisLayerSettings;
  highlighterSettings: IitcIrisHighlighterSettings;
  setBaseLayerId: Dispatch<StateUpdater<IitcIrisBaseLayerId>>;
  toggleLayerSetting: (key: IitcIrisBooleanLayerSettingKey) => void;
  selectPortalHighlighter: (active: IitcIrisPortalHighlighterId) => void;
  syncLayerSettings: () => void;
  syncHighlighterSettings: () => void;
}

export function useLayerSettingsWorkflow(postMessage: (message: IitcIrisMessage) => void): LayerSettingsWorkflow {
  const [baseLayerId, setBaseLayerId] = useState(loadStoredBaseLayerId);
  const [layerSettings, setLayerSettings] = useState(loadStoredLayerSettings);
  const [highlighterSettings, setHighlighterSettings] = useState(loadStoredHighlighterSettings);
  const layerSettingsIntentAtRef = useRef<number | undefined>(undefined);
  const highlighterSettingsIntentAtRef = useRef<number | undefined>(undefined);

  const toggleLayerSetting = (key: IitcIrisBooleanLayerSettingKey): void => {
    layerSettingsIntentAtRef.current = performance.now();
    setLayerSettings((current) => calculateToggledLayerSettings(current, key));
  };

  const selectPortalHighlighter = (active: IitcIrisPortalHighlighterId): void => {
    highlighterSettingsIntentAtRef.current = performance.now();
    setHighlighterSettings(buildHighlighterSettingsValue(active));
  };

  const syncLayerSettings = useCallback(() => {
    storeLayerSettings(layerSettings);
    const sentAt = layerSettingsIntentAtRef.current ?? performance.now();
    layerSettingsIntentAtRef.current = undefined;
    postMessage(buildLayerSettingsMessage(layerSettings, baseLayerId, sentAt));
  }, [baseLayerId, layerSettings, postMessage]);

  const syncHighlighterSettings = useCallback(() => {
    storeHighlighterSettings(highlighterSettings);
    const sentAt = highlighterSettingsIntentAtRef.current ?? performance.now();
    highlighterSettingsIntentAtRef.current = undefined;
    postMessage(buildHighlighterSettingsMessage(highlighterSettings, sentAt));
  }, [highlighterSettings, postMessage]);

  return {
    baseLayerId,
    layerSettings,
    highlighterSettings,
    setBaseLayerId,
    toggleLayerSetting,
    selectPortalHighlighter,
    syncLayerSettings,
    syncHighlighterSettings,
  };
}

// Keep synchronization at the app's existing position, after its message listener.
export function useLayerSettingsEffects({
  syncLayerSettings,
  syncHighlighterSettings,
}: Pick<ReturnType<typeof useLayerSettingsWorkflow>, 'syncLayerSettings' | 'syncHighlighterSettings'>): void {
  useEffect(syncLayerSettings, [syncLayerSettings]);
  useEffect(syncHighlighterSettings, [syncHighlighterSettings]);
}
