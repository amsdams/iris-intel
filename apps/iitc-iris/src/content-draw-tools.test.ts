import {describe, expect, it} from 'vitest';
import {
  getDrawToolsItemCenter,
  getDrawToolsItemDetail,
  getDrawToolsItemLabel,
  isSupportedDrawToolsItem,
  stripDrawToolsStorageIndex,
} from './content-draw-tools';
import type {IitcIrisDrawToolsItem} from './messages';

describe('IITC IRIS Draw Tools helpers', () => {
  const marker: IitcIrisDrawToolsItem = {
    type: 'marker',
    storageIndex: 3,
    latLng: {lat: 52.1, lng: 4.2},
    color: '#ffffff',
    label: 'Target',
  };

  const link: IitcIrisDrawToolsItem = {
    type: 'polyline',
    storageIndex: 4,
    latLngs: [
      {lat: 52, lng: 4},
      {lat: 54, lng: 6},
    ],
    color: '#a24ac3',
  };

  it('formats labels and coordinate details for displayed items', () => {
    expect(getDrawToolsItemLabel(marker, 0)).toBe('Target');
    expect(getDrawToolsItemLabel({...marker, label: undefined}, 1)).toBe('Marker 2');
    expect(getDrawToolsItemLabel(link, 2)).toBe('Link 3');
    expect(getDrawToolsItemDetail(marker)).toBe('52.100000, 4.200000');
    expect(getDrawToolsItemDetail(link)).toBe('52.000000, 4.000000 -> 54.000000, 6.000000');
  });

  it('computes item centers used by map centering actions', () => {
    expect(getDrawToolsItemCenter(marker)).toEqual({lat: 52.1, lng: 4.2});
    expect(getDrawToolsItemCenter(link)).toEqual({lat: 53, lng: 5});
  });

  it('removes app-only storage indices before exporting IITC Draw Tools JSON', () => {
    expect(stripDrawToolsStorageIndex(marker)).toEqual({
      type: 'marker',
      latLng: {lat: 52.1, lng: 4.2},
      color: '#ffffff',
      label: 'Target',
    });
    expect(stripDrawToolsStorageIndex(link)).toEqual({
      type: 'polyline',
      latLngs: [
        {lat: 52, lng: 4},
        {lat: 54, lng: 6},
      ],
      color: '#a24ac3',
    });
  });

  it('keeps only supported Draw Tools item kinds for import', () => {
    expect(isSupportedDrawToolsItem({type: 'marker', latLng: {lat: 1, lng: 2}})).toBe(true);
    expect(isSupportedDrawToolsItem({type: 'polyline', latLngs: [{lat: 1, lng: 2}]})).toBe(true);
    expect(isSupportedDrawToolsItem({type: 'polygon', latLngs: [{lat: 1, lng: 2}]})).toBe(false);
  });
});
