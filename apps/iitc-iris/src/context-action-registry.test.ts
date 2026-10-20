import {describe, expect, it} from 'vitest';
import {
  CONTEXT_ACTION_REGISTRY,
  CONTEXT_TARGET_REGISTRY,
  getContextAction,
  getContextTarget,
  isContextActionVisible,
  type IitcIrisContextActionId,
  type IitcIrisContextTarget,
} from './context-action-registry';

describe('IITC IRIS context action registry', () => {
  it('keeps current context target labels registered in UI order', () => {
    const expectedTargets: IitcIrisContextTarget[] = ['map', 'link', 'field'];

    expect(CONTEXT_TARGET_REGISTRY.map((entry) => entry.id)).toEqual(expectedTargets);
    expect(getContextTarget('map')).toMatchObject({panelLabel: 'Context', objectLabel: 'Map'});
    expect(getContextTarget('link')).toMatchObject({panelLabel: 'Link details', objectLabel: 'Link', distanceLabel: 'Length'});
    expect(getContextTarget('field')).toMatchObject({panelLabel: 'Field details', objectLabel: 'Field', distanceLabel: 'Edge total'});
  });

  it('keeps current context actions and labels registered in UI order', () => {
    const expectedActions: IitcIrisContextActionId[] = ['copyGuid', 'copyAnchorGuids', 'center', 'copyLatLng', 'copyIntelUrl'];

    expect(CONTEXT_ACTION_REGISTRY.map((entry) => entry.id)).toEqual(expectedActions);
    expect(CONTEXT_ACTION_REGISTRY.map((entry) => entry.label)).toEqual(['GUID', 'Anchors', 'Center', 'LL', 'URL']);
    expect(getContextAction('copyIntelUrl')).toMatchObject({
      label: 'URL',
      title: 'Copy Intel URL for this context point',
    });
  });

  it('limits object-only actions to link and field contexts', () => {
    expect(isContextActionVisible('copyGuid', 'map')).toBe(false);
    expect(isContextActionVisible('copyGuid', 'link')).toBe(true);
    expect(isContextActionVisible('copyAnchorGuids', 'field')).toBe(true);
    expect(isContextActionVisible('center', 'map')).toBe(true);
    expect(isContextActionVisible('copyLatLng', 'field')).toBe(true);
  });
});
