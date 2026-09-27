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
} from '../messages';
import {ControlRow} from '../ui/control-row';
import { LayerCheckbox, LayerRadio } from '../ui/layer-choice';
import {Section} from '../ui/section';

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
    <LayerCheckbox
      key={id}
      label={title}
      title={`${title}: ${layerSettings[id] ? 'on' : 'off'}`}
      checked={layerSettings[id]}
      onChange={() => toggleLayerSetting(id)}
      aria-label={title}
    />
  );

  const renderHighlighterRadio = (option: (typeof PORTAL_HIGHLIGHTER_OPTIONS)[number]): h.JSX.Element => (
    <LayerRadio
      key={option.id}
      label={option.label}
      title={option.title}
      name="iitc-iris-portal-highlighter"
      checked={highlighterSettings.active === option.id}
      onChange={() => selectPortalHighlighter(option.id)}
      aria-label={option.label}
    />
  );

  return (
    <>
      <Section titleHeading="Base map">
        <ControlRow>
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
        </ControlRow>
      </Section>
      <Section titleHeading="Core overlays">
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Core overlay layers">
          {CORE_OVERLAY_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </Section>
      <Section titleHeading="Portal filters">
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Portal filter layers">
          {PORTAL_FILTER_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </Section>
      <Section titleHeading="Portal highlighter">
        <div className="iitc-iris-layer-choice-grid" role="radiogroup" aria-label="Portal highlighter">
          {PORTAL_HIGHLIGHTER_OPTIONS.map(renderHighlighterRadio)}
        </div>
      </Section>
      <Section titleHeading="Detail overlays">
        <div className="iitc-iris-layer-choice-grid" role="group" aria-label="Detail overlay layers">
          {DETAIL_LAYER_TOGGLE_LABELS.map(renderBooleanLayerCheckbox)}
        </div>
      </Section>
    </>
  );
}
