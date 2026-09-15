import type {
  IitcIrisBaseLayerId,
  IitcIrisHighlighterSettings,
  IitcIrisLayerSettings,
  IitcIrisMessage,
  IitcIrisPortalHighlighterId,
} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';
import type {IitcIrisBooleanLayerSettingKey} from './layer-registry';

export function calculateToggledLayerSettings(
  current: IitcIrisLayerSettings,
  key: IitcIrisBooleanLayerSettingKey
): IitcIrisLayerSettings {
  return {
    ...current,
    [key]: !current[key],
  };
}

export function buildHighlighterSettingsValue(
  active: IitcIrisPortalHighlighterId
): IitcIrisHighlighterSettings {
  return {active};
}

export function buildLayerSettingsMessage(
  layerSettings: IitcIrisLayerSettings,
  baseLayerId: IitcIrisBaseLayerId,
  sentAt: number
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.layerSettings,
    sentAt,
    layerSettings,
    baseLayerId,
  };
}

export function buildHighlighterSettingsMessage(
  highlighterSettings: IitcIrisHighlighterSettings,
  sentAt: number
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.layerSettings,
    sentAt,
    highlighterSettings,
  };
}
