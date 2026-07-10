import L, {type Map as LeafletMap, type Point as LeafletPoint} from 'leaflet';
import {createIitcMapContextPayload, type IitcMapContextPayloadOptions} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from './messages';

export interface IitcIrisContextGestureOptions {
  longPressMs: number;
  moveTolerancePx: number;
  onLongPressStarted: () => void;
  onContextPoint: (point: LeafletPoint) => void;
  getLastContextPostAt: () => number;
}

export function createIitcIrisMapContextMessage(options: IitcMapContextPayloadOptions): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.mapContext,
    ...createIitcMapContextPayload(options),
  };
}

export function installIitcIrisContextGestures(map: LeafletMap, options: IitcIrisContextGestureOptions): void {
  const container = map.getContainer();
  let timer: number | null = null;
  let start: {x: number; y: number} | null = null;

  const clear = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    start = null;
  };

  container.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      clear();
      return;
    }

    const touch = event.touches[0];
    const rect = container.getBoundingClientRect();
    start = {x: touch.clientX - rect.left, y: touch.clientY - rect.top};
    timer = window.setTimeout(() => {
      if (!start) return;
      options.onLongPressStarted();
      options.onContextPoint(L.point(start.x, start.y));
      clear();
    }, options.longPressMs);
  }, {passive: true});

  container.addEventListener('touchmove', (event) => {
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (Math.hypot(x - start.x, y - start.y) > options.moveTolerancePx) clear();
  }, {passive: true});

  container.addEventListener('touchend', clear, {passive: true});
  container.addEventListener('touchcancel', clear, {passive: true});

  container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const startedAt = performance.now();
    window.setTimeout(() => {
      if (options.getLastContextPostAt() >= startedAt) return;
      const rect = container.getBoundingClientRect();
      options.onContextPoint(L.point(event.clientX - rect.left, event.clientY - rect.top));
    }, 0);
  }, {capture: true});
}
