import {describe, expect, it} from 'vitest';
import {getIngressPortalRadiusForZoom, getMaxResonatorEnergy, getPortalHealthBucket, getPortalResonatorEnergySummary, getResonatorEnergyPercent, isPortalHealthBucketVisible} from './portal-display';

describe('portal display helpers', () => {
  it('maps portal health to IRIS filter buckets', () => {
    expect(getPortalHealthBucket(0)).toBe(25);
    expect(getPortalHealthBucket(25)).toBe(25);
    expect(getPortalHealthBucket(26)).toBe(50);
    expect(getPortalHealthBucket(50)).toBe(50);
    expect(getPortalHealthBucket(51)).toBe(75);
    expect(getPortalHealthBucket(75)).toBe(75);
    expect(getPortalHealthBucket(76)).toBe(100);
    expect(getPortalHealthBucket(100)).toBe(100);
  });

  it('checks portal health bucket visibility', () => {
    expect(isPortalHealthBucketVisible(undefined, {25: false, 50: false, 75: false, 100: false})).toBe(true);
    expect(isPortalHealthBucketVisible(20, {25: false, 50: true, 75: true, 100: true})).toBe(false);
    expect(isPortalHealthBucketVisible(80, {25: true, 50: true, 75: true, 100: false})).toBe(false);
  });

  it('interpolates Intel-style portal radius from shared zoom stops', () => {
    expect(getIngressPortalRadiusForZoom(Number.NaN)).toBe(1);
    expect(getIngressPortalRadiusForZoom(3)).toBe(1);
    expect(getIngressPortalRadiusForZoom(10)).toBe(2);
    expect(getIngressPortalRadiusForZoom(15)).toBe(6);
    expect(getIngressPortalRadiusForZoom(20)).toBe(6);
    expect(getIngressPortalRadiusForZoom(12.5)).toBe(4);
  });

  it('derives resonator energy percentages from Intel max energy by level', () => {
    expect(getMaxResonatorEnergy(1)).toBe(1000);
    expect(getMaxResonatorEnergy(8)).toBe(6000);
    expect(getMaxResonatorEnergy(0)).toBe(0);
    expect(getResonatorEnergyPercent({level: 4, energy: 1250})).toBe(50);
    expect(getResonatorEnergyPercent({level: 4, energy: 9999})).toBe(100);
    expect(getResonatorEnergyPercent(null)).toBe(0);
  });

  it('summarizes portal resonator energy', () => {
    expect(getPortalResonatorEnergySummary([
      {level: 1, energy: 500, owner: 'a'},
      {level: 8, energy: 6000, owner: 'b'},
    ])).toEqual({
      totalEnergy: 6500,
      maxEnergy: 7000,
    });
  });
});
