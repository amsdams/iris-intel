import L, {type Map as LeafletMap, type Point as LeafletPoint} from 'leaflet';
import {createIitcMapContextPayload, type IitcMapContextPayloadOptions} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../messages';

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

export function installIitcIrisContextGestures(map: LeafletMap, options: IitcIrisContextGestureOptions): () => void {
  const container = map.getContainer();
  const contextTimers = new Set<number>();
  let timer: number | null = null;
  let start: {x: number; y: number} | null = null;

  const clear = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    start = null;
  };

  const onTouchStart = (event: TouchEvent): void => {
    clear();
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const rect = container.getBoundingClientRect();
    start = {x: touch.clientX - rect.left, y: touch.clientY - rect.top};
    timer = window.setTimeout(() => {
      if (!start) return;
      options.onLongPressStarted();
      options.onContextPoint(L.point(start.x, start.y));
      clear();
    }, options.longPressMs);
  };

  const onTouchMove = (event: TouchEvent): void => {
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (Math.hypot(x - start.x, y - start.y) > options.moveTolerancePx) clear();
  };

  const onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const startedAt = performance.now();
    const contextTimer = window.setTimeout(() => {
      contextTimers.delete(contextTimer);
      if (options.getLastContextPostAt() >= startedAt) return;
      const rect = container.getBoundingClientRect();
      options.onContextPoint(L.point(event.clientX - rect.left, event.clientY - rect.top));
    }, 0);
    contextTimers.add(contextTimer);
  };

  container.addEventListener('touchstart', onTouchStart, {passive: true});
  container.addEventListener('touchmove', onTouchMove, {passive: true});
  container.addEventListener('touchend', clear, {passive: true});
  container.addEventListener('touchcancel', clear, {passive: true});
  container.addEventListener('contextmenu', onContextMenu, {capture: true});

  return (): void => {
    clear();
    for (const contextTimer of contextTimers) window.clearTimeout(contextTimer);
    contextTimers.clear();
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('touchend', clear);
    container.removeEventListener('touchcancel', clear);
    container.removeEventListener('contextmenu', onContextMenu, {capture: true});
  };
}
