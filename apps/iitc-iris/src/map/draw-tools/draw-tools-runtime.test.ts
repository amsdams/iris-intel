import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Layer, Map as LeafletMap} from 'leaflet';
import {IITC_DRAW_TOOLS_KEY_STORAGE, parseIitcDrawToolsLayer, type IitcDrawToolsItem} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../../messages';
import {DEFAULT_LAYER_SETTINGS} from '../layers/layer-registry';
import {createDrawToolsRuntime} from './draw-tools-runtime';

const leaflet = vi.hoisted(() => ({marker: vi.fn(), circleMarker: vi.fn(), divIcon: vi.fn(), line: vi.fn()}));
vi.mock('leaflet', () => ({default: leaflet}));
vi.mock('../leaflet-geodesic', () => ({createIitcGeodesicPolyline: leaflet.line}));

describe('Draw Tools runtime ownership', () => {
  let stored: string;
  let settings: typeof DEFAULT_LAYER_SETTINGS;
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();
  const addLayer = vi.fn<(layer: Layer) => void>();
  const clearLayers = vi.fn();
  let runtime: ReturnType<typeof createDrawToolsRuntime>;
  const marker: IitcDrawToolsItem = {type: 'marker', latLng: {lat: 52, lng: 4}, color: '#ff0000', label: 'Original'};

  beforeEach(() => {
    vi.clearAllMocks();
    stored = JSON.stringify([{type: 'circle', latLng: {lat: 51, lng: 3}, radius: 100}, marker]);
    settings = {...DEFAULT_LAYER_SETTINGS, drawnMarkers: true, drawnLinks: true};
    vi.stubGlobal('window', {postMessage, localStorage: {
      getItem: (key: string) => key === IITC_DRAW_TOOLS_KEY_STORAGE ? stored : null,
      setItem: (key: string, value: string) => { expect(key).toBe(IITC_DRAW_TOOLS_KEY_STORAGE); stored = value; },
    }});
    for (const factory of [leaflet.marker, leaflet.circleMarker, leaflet.line]) factory.mockReturnValue({});
    runtime = createDrawToolsRuntime({getMap: () => ({}) as LeafletMap,
      getEntities: () => undefined, getLayerSettings: () => settings, hasIncompletePortalData: () => false,
      isLinkVisible: () => true, clearLayers, addLayer, pane: 'iitc-iris-drawnItems'});
  });
  afterEach(() => vi.unstubAllGlobals());
  const action = (message: Partial<IitcIrisMessage>): void => runtime.applyIitcDrawToolsAction({type: IITC_IRIS_MESSAGES.drawTools, ...message});

  it('preserves hidden stored shapes and storage indexes through rename, import, undo and clear', () => {
    action({drawToolsAction: 'requestStatus'});
    expect(postMessage.mock.lastCall?.[0].drawToolsItems).toEqual([expect.objectContaining({storageIndex: 1, label: 'Original'})]);
    action({drawToolsAction: 'rename', drawToolsIndex: 1, drawToolsLabel: 'Renamed'});
    expect(parseIitcDrawToolsLayer(stored)[0].type).toBe('circle');
    expect(postMessage.mock.lastCall?.[0].drawToolsItems?.[0]).toMatchObject({type: 'marker', label: 'Renamed'});
    action({drawToolsAction: 'import', drawToolsJson: JSON.stringify([{type: 'polyline', latLngs: [{lat: 52, lng: 4}, {lat: 53, lng: 5}]}])});
    expect(parseIitcDrawToolsLayer(stored).map(item => item.type)).toEqual(['circle', 'marker', 'polyline']);
    action({drawToolsAction: 'undo', drawToolsItemType: 'polyline'});
    expect(parseIitcDrawToolsLayer(stored).map(item => item.type)).toEqual(['circle', 'marker']);
    action({drawToolsAction: 'clear', drawToolsItemType: 'marker'});
    expect(parseIitcDrawToolsLayer(stored).map(item => item.type)).toEqual(['circle']);
  });

  it('reads current settings each render and keeps highlight across redraws without changing storage', () => {
    action({drawToolsAction: 'highlightIndex', drawToolsIndex: 1});
    expect(leaflet.marker).toHaveBeenCalledOnce();
    expect(leaflet.circleMarker).toHaveBeenCalledOnce();
    const original = stored;
    settings = {...settings, drawnMarkers: false};
    addLayer.mockClear();
    runtime.renderIitcDrawTools();
    expect(addLayer).not.toHaveBeenCalled();
    settings = {...settings, drawnMarkers: true};
    runtime.renderIitcDrawTools();
    expect(addLayer).toHaveBeenCalledTimes(2);
    expect(stored).toBe(original);
  });
});
