import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {parseMsgData, type IitcCommMessage} from '@iris/iitc-core';
import {createPlayerTrackerRuntime} from './player-tracker-runtime';
import type {IitcIrisLayerSettings} from '../../messages';
import {DEFAULT_LAYER_SETTINGS} from '../layers/layer-registry';

const leaflet = vi.hoisted(() => ({marker: vi.fn(), polyline: vi.fn(), icon: vi.fn(), divIcon: vi.fn()}));
vi.mock('leaflet', () => ({default: leaflet}));
type Options = Parameters<typeof createPlayerTrackerRuntime>[0];

function message(name = 'Agent', guid = 'message', offset = 0): IitcCommMessage {
  const parsed = parseMsgData([guid, Date.now() + offset, {plext: {text: `${name} captured Portal`,
    markup: [['PLAYER', {plain: name, team: 'RESISTANCE'}], ['TEXT', {plain: ' captured '}],
      ['PORTAL', {name: 'Portal', latE6: 52000000 + offset, lngE6: 4000000}]],
    categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}]);
  if (!parsed) throw new Error('expected parsed COMM message');
  return parsed;
}

function marker(): {options: Record<string, unknown>; setIcon: ReturnType<typeof vi.fn>; setOpacity: ReturnType<typeof vi.fn>;
  addTo: ReturnType<typeof vi.fn>; bindPopup: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>;
  getLatLng: () => {equals: () => boolean}; getElement: () => undefined; getPopup: () => undefined;
  remove: ReturnType<typeof vi.fn>} {
  return {options: {}, setIcon: vi.fn(), setOpacity: vi.fn(), addTo: vi.fn(), bindPopup: vi.fn(), on: vi.fn(),
    getLatLng: () => ({equals: () => true}), getElement: () => undefined, getPopup: () => undefined, remove: vi.fn()};
}

describe('Player Tracker runtime ownership', () => {
  let options: Options;
  let settings: IitcIrisLayerSettings;
  let map: LeafletMap;
  let zoom: number;
  let markers: ReturnType<typeof marker>[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    zoom = 16;
    settings = {...DEFAULT_LAYER_SETTINGS, playerTrackerResistance: true};
    map = {getZoom: () => zoom} as LeafletMap;
    markers = [];
    leaflet.marker.mockImplementation(() => {const next = marker(); markers.push(next); return next;});
    options = {getMap: (): LeafletMap => map, getLayerSettings: (): IitcIrisLayerSettings => settings,
      clearLayers: vi.fn(), addLayer: vi.fn(), repostLatestEntityStatus: vi.fn(), zoomToAndShowPortal: vi.fn(),
      defaultZoom: 11, assetBaseUrl: 'https://assets.test/', pane: 'tracker'};
  });
  afterEach(() => vi.useRealTimers());

  it('groups players, keeps marker identity on duplicate COMM and retains faction filtering', () => {
    const runtime = createPlayerTrackerRuntime(options);
    const messages = [message(), message('Other', 'other')];
    runtime.processPlayerTrackerCommMessages(messages);
    runtime.renderPlayerTracker();
    expect(markers).toHaveLength(1);
    expect(leaflet.divIcon).toHaveBeenLastCalledWith(expect.objectContaining({html: '<span>2</span>'}));
    expect(runtime.getDiagnostics()).toMatchObject({markers: 1, traces: 0, players: 2});
    runtime.processPlayerTrackerCommMessages(messages);
    runtime.renderPlayerTracker();
    expect(markers).toHaveLength(1);
    expect(markers[0].remove).not.toHaveBeenCalled();
    settings = {...DEFAULT_LAYER_SETTINGS, playerTrackerEnlightened: true};
    runtime.renderPlayerTracker();
    expect(markers[0].remove).toHaveBeenCalledOnce();
    expect(runtime.getDiagnostics().markers).toBe(0);
  });

  it('recreates markers on the replacement map while retaining history and traces', () => {
    const runtime = createPlayerTrackerRuntime(options);
    runtime.processPlayerTrackerCommMessages([message(), message('Agent', 'second', 1000)]);
    runtime.renderPlayerTracker();
    expect(runtime.getDiagnostics().traces).toBe(1);
    runtime.dispose();
    const oldMap = map;
    map = {getZoom: () => zoom} as LeafletMap;
    runtime.renderPlayerTracker();
    expect(markers).toHaveLength(2);
    expect(markers[0].remove).toHaveBeenCalledOnce();
    expect(markers[0].addTo).toHaveBeenCalledExactlyOnceWith(oldMap);
    expect(markers[1].addTo).toHaveBeenCalledExactlyOnceWith(map);
    expect(runtime.getDiagnostics()).toMatchObject({players: 1, markers: 1, traces: 1});
  });

});
