import {describe, expect, it} from 'vitest';
import {getIitcDataZoomForMapZoom, getIitcMapZoomTileParameters} from './tile-params';

describe('IITC tile params', () => {
  it('matches IITC portal availability threshold', () => {
    expect(getIitcMapZoomTileParameters(14).hasPortals).toBe(false);
    expect(getIitcMapZoomTileParameters(15).hasPortals).toBe(true);
  });

  it('coalesces data zoom like IITC map_data_calc_tools', () => {
    expect(getIitcDataZoomForMapZoom(12)).toBe(12);
    expect(getIitcDataZoomForMapZoom(14)).toBe(13);
    expect(getIitcDataZoomForMapZoom(15)).toBe(15);
    expect(getIitcDataZoomForMapZoom(16)).toBe(15);
  });
});
