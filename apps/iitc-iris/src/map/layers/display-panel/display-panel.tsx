import { h } from 'preact';
import './display-panel.css';
import {
  CORE_LAYER_TOGGLE_REGISTRY,
  DETAIL_LAYER_TOGGLE_REGISTRY,
  type IitcIrisBooleanLayerSettingKey,
} from '../layer-registry';
import { PORTAL_HIGHLIGHTER_REGISTRY } from '../highlighter-registry';
import type {
  IitcIrisHighlighterSettings,
  IitcIrisLayerSettings,
  IitcIrisPortalHighlighterId,
} from '../../../messages';
import { LayerChoice } from '../../../ui/layer-choice';
import {Section} from '../../../ui/section';
import {MapDataNotice} from '../../map-data-notice';

interface BooleanLayerToggleEntry {
  id: IitcIrisBooleanLayerSettingKey;
  title: string;
}

const CORE_OVERLAY_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'overlay').map((entry) => ({ id: entry.id, title: entry.title }));
const PORTAL_FILTER_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = CORE_LAYER_TOGGLE_REGISTRY.filter((entry) => entry.kind === 'filter').map((entry) => ({ id: entry.id, title: entry.title }));
const DETAIL_LAYER_TOGGLE_LABELS: BooleanLayerToggleEntry[] = DETAIL_LAYER_TOGGLE_REGISTRY.map((entry) => ({ id: entry.id, title: entry.title }));

const PORTAL_HIGHLIGHTER_OPTIONS = PORTAL_HIGHLIGHTER_REGISTRY.map((entry) => ({
  id: entry.id,
  label: entry.label,
  title: entry.title,
}));

export interface IitcIrisDisplayPanelProps {
  cameraZoom: number;
  highlighterSettings: IitcIrisHighlighterSettings;
  layerSettings: IitcIrisLayerSettings;
  selectPortalHighlighter: (active: IitcIrisPortalHighlighterId) => void;
  toggleLayerSetting: (key: IitcIrisBooleanLayerSettingKey) => void;
}

export function IitcIrisDisplayPanel({
  cameraZoom,
  highlighterSettings,
  layerSettings,
  selectPortalHighlighter,
  toggleLayerSetting,
}: IitcIrisDisplayPanelProps): h.JSX.Element {
  const renderBooleanLayerCheckbox = ({ id, title }: BooleanLayerToggleEntry): h.JSX.Element => (
    <LayerChoice
      type="checkbox"
      key={id}
      label={title}
      title={`${title}: ${layerSettings[id] ? 'on' : 'off'}`}
      checked={layerSettings[id]}
      onChange={() => toggleLayerSetting(id)}
      aria-label={title}
    />
  );

  const renderHighlighterRadio = (option: (typeof PORTAL_HIGHLIGHTER_OPTIONS)[number]): h.JSX.Element => (
    <LayerChoice
      type="radio"
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
      <MapDataNotice cameraZoom={cameraZoom} enabledPortalDetails={layerSettings.portals && (layerSettings.labels || highlighterSettings.active !== 'none')} />
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
