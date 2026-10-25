import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {createBaseLayerController, type BaseLayerStatus} from './base-layer-controller';

const mocks = vi.hoisted(() => ({create: vi.fn()}));
vi.mock('./base-layers', () => ({createBaseLayer: mocks.create}));

class Events {
  listeners = new Map<string, Set<() => void>>();
  on(name: string, callback: () => void): this {
    const callbacks = this.listeners.get(name) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(name, callbacks);
    return this;
  }
  off(name: string, callback: () => void): this { this.listeners.get(name)?.delete(callback); return this; }
  fire(name: string): void { for (const callback of this.listeners.get(name) ?? []) callback(); }
}
class Renderer extends Events {
  resize = vi.fn();
  triggerRepaint = vi.fn();
  loaded = vi.fn(() => true);
}
class Layer extends Events {
  renderer: Renderer | undefined;
  addTo = vi.fn(() => this);
  constructor(vector: boolean) { super(); if (vector) this.renderer = new Renderer(); }
  getMaplibreMap(): Renderer | undefined { return this.renderer; }
}

describe('base layer recovery lifetime', () => {
  let layers: Layer[];
  let documentEvents: EventTarget;
  let hidden: boolean;
  let map: LeafletMap;
  let status: ReturnType<typeof vi.fn<(state: BaseLayerStatus) => void>>;
  let controller: ReturnType<typeof createBaseLayerController>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    layers = [];
    hidden = false;
    documentEvents = new EventTarget();
    Object.defineProperty(documentEvents, 'hidden', {get: () => hidden});
    vi.stubGlobal('document', documentEvents);
    vi.stubGlobal('window', {setTimeout, clearTimeout});
    mocks.create.mockImplementation((id: string) => {
      const layer = new Layer(id !== 'osm');
      layers.push(layer);
      return layer;
    });
    map = {removeLayer: vi.fn(), setMaxZoom: vi.fn()} as unknown as LeafletMap;
    status = vi.fn<(state: BaseLayerStatus) => void>();
    controller = createBaseLayerController(map, 'https://test/', status);
  });
  afterEach(() => { controller.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('falls back once when the style fails and does not retry either provider automatically', () => {
    controller.select('openfreemap-dark');
    layers[0].renderer?.fire('error');
    vi.advanceTimersByTime(2001);
    expect(status).toHaveBeenLastCalledWith({baseLayerId: 'osm', baseLayerRequestedId: 'openfreemap-dark', baseLayerError: 'load'});
    expect(map.setMaxZoom).toHaveBeenLastCalledWith(19);
    layers[1].fire('baseerror');
    vi.advanceTimersByTime(60_000);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detects a style that never completes loading', () => {
    controller.select('openfreemap-dark');
    vi.advanceTimersByTime(20_001);
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('osm');
  });

  it('keeps watching for failures after the first successful render', () => {
    controller.select('openfreemap-dark');
    layers[0].renderer?.fire('idle');
    vi.advanceTimersByTime(30_000);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    layers[0].renderer?.fire('error');
    vi.advanceTimersByTime(2001);
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('osm');
  });

  it('allows transient network and WebGL errors to recover', () => {
    controller.select('openfreemap-dark');
    layers[0].renderer?.fire('error');
    layers[0].renderer?.fire('idle');
    layers[0].renderer?.fire('webglcontextlost');
    vi.advanceTimersByTime(4000);
    layers[0].renderer?.fire('webglcontextrestored');
    layers[0].renderer?.fire('idle');
    vi.advanceTimersByTime(30_000);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses recovery deadlines in the background and checks the renderer on resume', () => {
    controller.select('openfreemap-dark');
    const renderer = layers[0].renderer;
    renderer?.fire('webglcontextlost');
    hidden = true;
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    hidden = false;
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    expect(renderer?.resize).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5001);
    expect(status.mock.lastCall?.[0].baseLayerError).toBe('webgl');
  });

  it('cancels a pending failure when a newer style is selected', () => {
    controller.select('openfreemap-dark');
    layers[0].renderer?.fire('error');
    controller.select('openfreemap-positron');
    layers[1].renderer?.fire('idle');
    vi.advanceTimersByTime(30_000);
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('openfreemap-positron');
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect([...layers[0].renderer?.listeners.values() ?? []].every(callbacks => callbacks.size === 0)).toBe(true);
  });

  it('defers failed WebGL initialization until the Leaflet add call completes', () => {
    mocks.create.mockImplementationOnce(() => {
      const layer = new Layer(false);
      layer.addTo.mockImplementationOnce(() => { layer.fire('baseerror'); return layer; });
      return layer;
    });
    controller.select('openfreemap-dark');
    expect(map.removeLayer).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('osm');
  });

  it('recovers from factory errors and detaches everything on map disposal', () => {
    mocks.create.mockImplementationOnce(() => { throw new Error('Cannot create renderer'); });
    controller.select('openfreemap-dark');
    vi.advanceTimersByTime(1);
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('osm');
    controller.select('openfreemap-positron');
    const renderer = layers.at(-1)?.renderer;
    controller.dispose();
    renderer?.fire('error');
    renderer?.fire('webglcontextlost');
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    controller.select('openfreemap-dark');
    expect(vi.getTimerCount()).toBe(0);
    expect(renderer?.resize).not.toHaveBeenCalled();
    expect(status.mock.lastCall?.[0].baseLayerId).toBe('openfreemap-positron');
  });
});
