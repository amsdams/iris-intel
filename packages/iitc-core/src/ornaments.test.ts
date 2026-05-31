import {describe, expect, it} from 'vitest';
import {getIitcOrnamentDefinition, isIitcExcludedOrnament, parseIitcOrnamentVisibilitySettings} from './ornaments';

describe('ornaments', () => {
  it('classifies known and dynamic ornament ids into IITC-style layers', () => {
    expect(getIitcOrnamentDefinition('sc5_p')).toEqual({layer: 'Scouting'});
    expect(getIitcOrnamentDefinition('ap7_v')).toEqual({layer: 'Anomaly'});
    expect(getIitcOrnamentDefinition('peBR_REWARD-10_999_999')).toEqual({layer: 'Battle'});
    expect(getIitcOrnamentDefinition('peNEWBEACON')).toEqual({layer: 'Beacons'});
  });

  it('parses IITC ornament visibility storage and applies exclusions', () => {
    const settings = parseIitcOrnamentVisibilitySettings({
      excludedOrnaments: ['ap'],
      knownOrnaments: {sc5_p: true, peNIA: false},
      layerGroupDisplayed: {Battle: false},
    });

    expect(isIitcExcludedOrnament('ap1', settings)).toBe(true);
    expect(isIitcExcludedOrnament('sc5_p', settings)).toBe(true);
    expect(isIitcExcludedOrnament('peBB_BATTLE', settings)).toBe(true);
    expect(isIitcExcludedOrnament('peNIA', settings)).toBe(false);
  });
});
