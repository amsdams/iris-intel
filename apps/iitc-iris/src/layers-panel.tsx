import { h } from 'preact';
import {
  CORE_LAYER_TOGGLE_REGISTRY,
  DETAIL_LAYER_TOGGLE_REGISTRY,
  type IitcIrisBooleanLayerSettingKey,
} from './layer-registry';
import { PORTAL_HIGHLIGHTER_REGISTRY } from './highlighter-registry';
import type {
  IitcIrisBaseLayerId,
  IitcIrisHighlighterSettings,
  IitcIrisLayerSettings,
  IitcIrisPortalHighlighterId,
} from './messages';

export interface BooleanLayerToggleEntry {
  id: IitcIrisBooleanLayerSettingKey;
  title: string;
}

export const BASE_LAYER_OPTIONS: { id: IitcIrisBaseLayerId; label: string; title: string }[] = [
  { id: 'cartodb-dark-matter', label: 'Dark', title: 'CartoDB Dark Matter' },
  { id: 'cartodb-positron', label: 'Light', title: 'CartoDB Positron' },
  { id: 'osm', label: 'OSM', title: 'OpenStreetMap' },
];

export const CORE_OVERLAY_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'overlay').map((entry) => ({ id: entry.id, title: entry.title }));
export const PORTAL_FILTER_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'filter').map((entry) => ({ id: entry.id, title: entry.title }));
export const DETAIL_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = DETAIL_LAYER_TOGGLE_REGISTRY.map((entry) => ({ id: entry.id, title: entry.title }));

export const PORTAL_HIGHLIGHTER_OPTIONS = PORTAL_HIGHLIGHTER_REGISTRY.map((entry) => ({
  id: entry.id,
  label: entry.label,
  title: entry.title,
}));

export interface IitcIrisLayersPanelProps {
  baseLayerId: IitcIrisBaseLayerId;
  highlighterSettings: IitcIrisHighlighterSettings;
  layerSettings: IitcIrisLayerSettings;
  selectBaseLayer: (id: IitcIrisBaseLayerId) => void;
  selectPortalHighlighter: (active: IitcIrisPortalHighlighterId) => void;
  toggleLayerSetting: (key: IitcIrisBooleanLayerSettingKey) => void;
}

export function IitcIrisLayersPanel({
  baseLayerId,
  highlighterSettings,
  layerSettings,
  selectBaseLayer,
  selectPortalHighlighter,
  toggleLayerSetting,
}: IitcIrisLayersPanelProps): h.JSX.Element {
  const renderBooleanLayerCheckbox = ({ id, title }: BooleanLayerToggleEntry): h.JSX.Element => (
    <label key={id} className={`iitc-iris-layer-choice ${layerSettings[id] ? 'is-checked' : ''}`} title={`${title}: ${layerSettings[id] ? 'on' : 'off'}`}>
      <input
        type="checkbox"
        checked={layerSettings[id]}
        onChange={() => toggleLayerSetting(id)}
        aria-label={title}
      />
      <span className="iitc-iris-layer-choice-label">{title}</span>
    </label>
  );

  const renderHighlighterRadio = (option: (typeof PORTAL_HIGHLIGHTER_OPTIONS)[number]): h.JSX.Element => (
    <label key={option.id} className={`iitc-iris-layer-choice ${highlighterSettings.active === option.id ? 'is-checked' : ''}`} title={option.title}>
      <input
        type="radio"
        name="iitc-iris-portal-highlighter"
        checked={highlighterSettings.active === option.id}
        onChange={() => selectPortalHighlighter(option.id)}
        aria-label={option.label}
      />
      <span className="iitc-iris-layer-choice-label">{option.label}</span>
    </label>
  );

  return (
    <>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Base map</span>
        <div className="iitc-iris-map-control-row">
          {BASE_LAYER_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`iitc-iris-layer-toggle iitc-iris-base-toggle ${baseLayerId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => selectBaseLayer(option.id)}
              title={option.title}
              aria-pressed={baseLayerId === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Core overlays</span>
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Core overlay layers">
          {CORE_OVERLAY_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Portal filters</span>
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Portal filter layers">
          {PORTAL_FILTER_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Portal highlighter</span>
        <div className="iitc-iris-layer-choice-grid" role="radiogroup" aria-label="Portal highlighter">
          {PORTAL_HIGHLIGHTER_OPTIONS.map(renderHighlighterRadio)}
        </div>
      </div>
      <div className="iitc-iris-map-controls-section">
        <span className="iitc-iris-status">Detail overlays</span>
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Detail overlay layers">
          {DETAIL_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </div>
    </>
  );
}
