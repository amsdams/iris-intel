import {describe, expect, it} from 'vitest';
import {DEFAULT_LAYER_SETTINGS} from './layer-registry';
import {getLayerUpdatePlan} from './layer-update-routing';

describe('IITC IRIS layer update routing', () => {
  it('routes core portal visibility changes through entity rendering', () => {
    const next = {...DEFAULT_LAYER_SETTINGS, portals: false};

    expect(getLayerUpdatePlan(DEFAULT_LAYER_SETTINGS, next)).toMatchObject({
      changedKeys: ['portals'],
      renderEntities: true,
      renderTileDebug: false,
      renderDrawTools: false,
      renderPlayerTracker: false,
    });
  });

  it('routes tile debug toggles without entity rendering', () => {
    const next = {...DEFAULT_LAYER_SETTINGS, tiles: true};

    expect(getLayerUpdatePlan(DEFAULT_LAYER_SETTINGS, next)).toMatchObject({
      changedKeys: ['tiles'],
      renderEntities: false,
      renderTileDebug: true,
      renderDrawTools: false,
      renderPlayerTracker: false,
    });
  });

  it('routes draw tool and player tracker toggles to their own overlays', () => {
    expect(getLayerUpdatePlan(DEFAULT_LAYER_SETTINGS, {...DEFAULT_LAYER_SETTINGS, drawnLinks: false})).toMatchObject({
      renderEntities: false,
      renderDrawTools: true,
      renderPlayerTracker: false,
    });
    expect(getLayerUpdatePlan(DEFAULT_LAYER_SETTINGS, {...DEFAULT_LAYER_SETTINGS, playerTrackerResistance: true})).toMatchObject({
      renderEntities: false,
      renderDrawTools: false,
      renderPlayerTracker: true,
    });
  });

  it('routes secondary entity overlays through entity rendering', () => {
    expect(getLayerUpdatePlan(DEFAULT_LAYER_SETTINGS, {...DEFAULT_LAYER_SETTINGS, labels: true})).toMatchObject({
      changedKeys: ['labels'],
      renderEntities: true,
      renderTileDebug: false,
      renderDrawTools: false,
      renderPlayerTracker: false,
    });
  });
});
