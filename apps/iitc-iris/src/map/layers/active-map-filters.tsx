import {h} from 'preact';
import {CORE_LAYER_TOGGLE_REGISTRY, type IitcIrisBooleanLayerSettingKey} from './layer-registry';
import type {IitcIrisLayerSettings} from '../../messages';
import {ActionButton} from '../../ui/action-button';
import '../../ui/shared/section-summary.css';
import './active-map-filters.css';

/** Visibility settings only: decorations never imply that map data is hidden. */
export function ActiveMapFilters({layerSettings, toggleLayerSetting, inspect}: {
  layerSettings: IitcIrisLayerSettings;
  toggleLayerSetting: (key: IitcIrisBooleanLayerSettingKey) => void;
  inspect?: () => void;
}): h.JSX.Element | null {
  const hidden = CORE_LAYER_TOGGLE_REGISTRY.filter(entry => !layerSettings[entry.id]);
  if (!hidden.length) return null;
  return <div className="iitc-iris-active-map-filters" role="group" aria-label="Active map filters">
    {hidden.length > 2 ? <details><summary className="iitc-iris-section-summary">Hidden: {hidden.length} map layers and portal filters</summary>
      <p>{hidden.map(entry => entry.title).join(', ')}</p>
    </details> : <span>Hidden: {hidden.map(entry => entry.title).join(', ')}</span>}
    {inspect && <ActionButton onClick={inspect}>Inspect filters</ActionButton>}
    <ActionButton onClick={() => hidden.forEach(entry => toggleLayerSetting(entry.id))}>Show all map data</ActionButton>
  </div>;
}
