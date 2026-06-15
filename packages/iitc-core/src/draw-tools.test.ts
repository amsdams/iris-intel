import {describe, expect, it} from 'vitest';
import {
  IITC_DRAW_TOOLS_DEFAULT_COLOR,
  IITC_DRAW_TOOLS_KEY_STORAGE,
  importIitcDrawToolsItems,
  normalizeIitcDrawToolsLabel,
  parseIitcDrawToolsLayer,
  serializeIitcDrawToolsLayer,
  type IitcDrawToolsItem,
} from './draw-tools';

describe('IITC Draw Tools storage', () => {
  it('keeps IITC storage constants', () => {
    expect(IITC_DRAW_TOOLS_KEY_STORAGE).toBe('plugin-draw-tools-layer');
    expect(IITC_DRAW_TOOLS_DEFAULT_COLOR).toBe('#a24ac3');
  });

  it('round-trips polyline and marker Draw Tools JSON', () => {
    const items: IitcDrawToolsItem[] = [
      {
        type: 'polyline',
        latLngs: [
          {lat: 52.37, lng: 4.89},
          {lat: 52.38, lng: 4.9},
        ],
        color: '#a24ac3',
      },
      {
        type: 'marker',
        latLng: {lat: 52.371, lng: 4.891},
        color: '#c34a4a',
        label: 'Farm meetup',
      },
    ];

    expect(parseIitcDrawToolsLayer(serializeIitcDrawToolsLayer(items))).toEqual(items);
  });

  it('keeps IITC-compatible JSON shape for all Draw Tools item types', () => {
    const iitcJson = '[{"type":"polyline","latLngs":[{"lat":52.37,"lng":4.89},{"lat":52.38,"lng":4.9}],"color":"#a24ac3"},{"type":"polygon","latLngs":[{"lat":52.37,"lng":4.89},{"lat":52.38,"lng":4.9},{"lat":52.39,"lng":4.91}],"color":"#c34a4a"},{"type":"circle","latLng":{"lat":52.371,"lng":4.891},"radius":250,"color":"#4aa8c3"},{"type":"marker","latLng":{"lat":52.372,"lng":4.892},"color":"#ffffff"}]';

    expect(serializeIitcDrawToolsLayer(parseIitcDrawToolsLayer(iitcJson))).toBe(iitcJson);
  });

  it('preserves optional IITC IRIS marker labels without requiring them for stock IITC JSON', () => {
    expect(parseIitcDrawToolsLayer('[{"type":"marker","latLng":{"lat":1,"lng":2},"color":"#fff"}]')).toEqual([{
      type: 'marker',
      latLng: {lat: 1, lng: 2},
      color: '#fff',
      label: undefined,
    }]);

    expect(parseIitcDrawToolsLayer('[{"type":"marker","latLng":{"lat":1,"lng":2},"label":"  Alpha anchor  "}]')).toEqual([{
      type: 'marker',
      latLng: {lat: 1, lng: 2},
      color: undefined,
      label: 'Alpha anchor',
    }]);
  });

  it('normalizes marker labels for UI-created Draw Tools records', () => {
    expect(normalizeIitcDrawToolsLabel(' Portal A ')).toBe('Portal A');
    expect(normalizeIitcDrawToolsLabel('   ')).toBeUndefined();
    expect(normalizeIitcDrawToolsLabel(null)).toBeUndefined();
  });

  it('accepts Leaflet-compatible coordinate arrays from imported JSON', () => {
    expect(parseIitcDrawToolsLayer(JSON.stringify([
      {
        type: 'polyline',
        latLngs: [
          [52.37, 4.89],
          ['52.38', '4.90'],
        ],
        color: '#4aa8c3',
      },
      {
        type: 'marker',
        latLng: [52.371, 4.891],
      },
    ]))).toEqual([
      {
        type: 'polyline',
        latLngs: [
          {lat: 52.37, lng: 4.89},
          {lat: 52.38, lng: 4.9},
        ],
        color: '#4aa8c3',
      },
      {
        type: 'marker',
        latLng: {lat: 52.371, lng: 4.891},
        color: undefined,
      },
    ]);
  });

  it('rejects invalid Draw Tools input', () => {
    expect(() => parseIitcDrawToolsLayer('{}')).toThrow('Invalid Draw Tools layer');
    expect(() => parseIitcDrawToolsLayer('[{"type":"polyline","latLngs":[{"lat":1,"lng":2}]}]')).toThrow('Invalid Draw Tools item[0].latLngs');
    expect(() => parseIitcDrawToolsLayer('[{"type":"marker","latLng":{"lat":"x","lng":2}}]')).toThrow('Invalid Draw Tools item[0].latLng.lat');
    expect(() => parseIitcDrawToolsLayer('[{"type":"rectangle"}]')).toThrow('Unknown Draw Tools item type at 0');
  });

  it('supports IITC merge and reset-before-import behavior', () => {
    const current: IitcDrawToolsItem[] = [
      {type: 'marker', latLng: {lat: 1, lng: 2}, color: '#a24ac3'},
    ];
    const imported: IitcDrawToolsItem[] = [
      {type: 'marker', latLng: {lat: 3, lng: 4}, color: '#c34a4a'},
    ];

    expect(importIitcDrawToolsItems(current, imported)).toEqual([...current, ...imported]);
    expect(importIitcDrawToolsItems(current, imported, {merge: true})).toEqual([...current, ...imported]);
    expect(importIitcDrawToolsItems(current, imported, {merge: false})).toEqual(imported);
  });
});
