import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {installIitcIrisContextGestures} from './map-context-runtime';

vi.mock('leaflet', () => ({default: {point: (x: number, y: number): {x: number; y: number} => ({x, y})}}));

function touch(type: string, x = 120, y = 230): Event {
  const event = new Event(type);
  Object.defineProperty(event, 'touches', {value: [{clientX: x, clientY: y}]});
  return event;
}

function contextMenu(): Event {
  const event = new Event('contextmenu', {cancelable: true});
  Object.defineProperties(event, {clientX: {value: 140}, clientY: {value: 250}});
  return event;
}

describe('map context gesture lifecycle', () => {
  const options = {
    longPressMs: 600,
    moveTolerancePx: 12,
    onLongPressStarted: vi.fn(),
    onContextPoint: vi.fn(),
    getLastContextPostAt: (): number => -Infinity,
  };
  let container: EventTarget;
  let map: LeafletMap;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('window', {setTimeout, clearTimeout});
    container = Object.assign(new EventTarget(), {getBoundingClientRect: () => ({left: 100, top: 200})});
    map = {getContainer: () => container} as unknown as LeafletMap;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fires one long press at container coordinates and cancels on movement or release', () => {
    const dispose = installIitcIrisContextGestures(map, options);
    container.dispatchEvent(touch('touchstart'));
    vi.advanceTimersByTime(600);
    expect(options.onLongPressStarted).toHaveBeenCalledOnce();
    expect(options.onContextPoint).toHaveBeenCalledWith({x: 20, y: 30});
    container.dispatchEvent(touch('touchstart'));
    container.dispatchEvent(touch('touchmove', 160));
    vi.advanceTimersByTime(600);
    container.dispatchEvent(touch('touchstart'));
    container.dispatchEvent(new Event('touchend'));
    vi.advanceTimersByTime(600);
    expect(options.onContextPoint).toHaveBeenCalledOnce();
    dispose();
  });

  it('cancels both pending gesture timers and removes handlers before reinstalling on the same container', () => {
    const dispose = installIitcIrisContextGestures(map, options);
    container.dispatchEvent(touch('touchstart'));
    const oldMenu = contextMenu();
    container.dispatchEvent(oldMenu);
    expect(oldMenu.defaultPrevented).toBe(true);
    dispose();
    dispose();
    vi.runAllTimers();
    expect(options.onContextPoint).not.toHaveBeenCalled();
    const detachedMenu = contextMenu();
    container.dispatchEvent(detachedMenu);
    expect(detachedMenu.defaultPrevented).toBe(false);
    const next = installIitcIrisContextGestures(map, options);
    container.dispatchEvent(touch('touchstart'));
    vi.advanceTimersByTime(600);
    expect(options.onLongPressStarted).toHaveBeenCalledOnce();
    expect(options.onContextPoint).toHaveBeenCalledOnce();
    next();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the delayed context-menu fallback and suppresses duplicate Leaflet handling', () => {
    const dispose = installIitcIrisContextGestures(map, options);
    container.dispatchEvent(contextMenu());
    expect(options.onContextPoint).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(options.onContextPoint).toHaveBeenCalledWith({x: 40, y: 50});
    dispose();
    const next = installIitcIrisContextGestures(map, {...options, getLastContextPostAt: () => Infinity});
    container.dispatchEvent(contextMenu());
    vi.runAllTimers();
    expect(options.onContextPoint).toHaveBeenCalledOnce();
    next();
  });
});
