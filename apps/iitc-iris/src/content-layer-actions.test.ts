import {describe, expect, it} from 'vitest';
import {
  buildHighlighterSettingsMessage,
  buildHighlighterSettingsValue,
  buildLayerSettingsMessage,
  calculateToggledLayerSettings,
} from './content-layer-actions';
import {DEFAULT_LAYER_SETTINGS} from './layer-registry';
import {IITC_IRIS_MESSAGES} from './messages';

describe('content-layer-actions', () => {
  it('toggles boolean layer setting', () => {
    const updated = calculateToggledLayerSettings(DEFAULT_LAYER_SETTINGS, 'links');
    expect(updated.links).toBe(!DEFAULT_LAYER_SETTINGS.links);
    expect(updated.fields).toBe(DEFAULT_LAYER_SETTINGS.fields);
  });

  it('builds highlighter settings value', () => {
    const res = buildHighlighterSettingsValue('none');
    expect(res).toEqual({active: 'none'});
  });

  it('builds layer settings message', () => {
    const msg = buildLayerSettingsMessage(DEFAULT_LAYER_SETTINGS, 'cartodb-dark-matter', 100);
    expect(msg).toEqual({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt: 100,
      layerSettings: DEFAULT_LAYER_SETTINGS,
      baseLayerId: 'cartodb-dark-matter',
    });
  });

  it('builds highlighter settings message', () => {
    const msg = buildHighlighterSettingsMessage({active: 'none'}, 200);
    expect(msg).toEqual({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt: 200,
      highlighterSettings: {active: 'none'},
    });
  });
});
