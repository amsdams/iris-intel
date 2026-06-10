import {describe, expect, it} from 'vitest';
import {
  BOOLEAN_LAYER_REGISTRY,
  CORE_LAYER_TOGGLE_REGISTRY,
  DEFAULT_LAYER_SETTINGS,
  DETAIL_LAYER_TOGGLE_REGISTRY,
  DETAIL_TRI_STATE_LAYER_TOGGLE_REGISTRY,
  LAYER_REGISTRY_DIAGNOSTICS,
  TRI_STATE_LAYER_REGISTRY,
} from './layer-registry';

describe('IITC IRIS layer registry', () => {
  it('derives current layer defaults from registered controls plus legacy player tracker state', () => {
    expect(DEFAULT_LAYER_SETTINGS).toMatchObject({
      fields: true,
      links: true,
      portals: true,
      unclaimedPortals: true,
      level1Portals: true,
      level2Portals: true,
      level3Portals: true,
      level4Portals: true,
      level5Portals: true,
      level6Portals: true,
      level7Portals: true,
      level8Portals: true,
      resistance: true,
      enlightened: true,
      machina: true,
      ornaments: false,
      artifacts: false,
      labels: false,
      tiles: false,
      drawnLinks: true,
      drawnMarkers: true,
      playerTracker: false,
      playerTrackerResistance: false,
      playerTrackerEnlightened: false,
      playerTrackerMachina: false,
      keyCount: 'off',
    });
  });

  it('keeps UI groups and diagnostics in sync with registered layers', () => {
    const registryIds = [
      ...BOOLEAN_LAYER_REGISTRY.map((entry) => entry.id),
      ...TRI_STATE_LAYER_REGISTRY.map((entry) => entry.id),
    ];
    const groupedIds = [
      ...CORE_LAYER_TOGGLE_REGISTRY.map((entry) => entry.id),
      ...DETAIL_LAYER_TOGGLE_REGISTRY.map((entry) => entry.id),
      ...DETAIL_TRI_STATE_LAYER_TOGGLE_REGISTRY.map((entry) => entry.id),
    ];

    expect(groupedIds).toEqual(registryIds);
    expect(LAYER_REGISTRY_DIAGNOSTICS.map((entry) => entry.id)).toEqual(registryIds);
    expect(LAYER_REGISTRY_DIAGNOSTICS.find((entry) => entry.id === 'keyCount')).toMatchObject({
      setting: 'tri-state',
      defaultValue: 'off',
    });
    expect(LAYER_REGISTRY_DIAGNOSTICS.find((entry) => entry.id === 'portals')).toMatchObject({
      kind: 'overlay',
      setting: 'boolean',
      defaultValue: true,
    });
  });
});
