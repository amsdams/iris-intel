import type {Map as LeafletMap} from 'leaflet';

export interface IitcIrisMapLifetime {
  readonly signal: AbortSignal;
  schedule: (callback: () => void, delayMs: number) => number | undefined;
  cancelScheduled: (timer: number | undefined) => void;
  requestFrame: (callback: FrameRequestCallback) => number | undefined;
  fetchText: (url: string, init?: RequestInit) => Promise<{response: Response; text: string}>;
  dispose: () => void;
}

/** Own resources that must end together when this particular map is removed. */
export function createIitcIrisMapLifetime(
  map: Pick<LeafletMap, 'on' | 'off' | 'remove'>,
  onDispose: () => void,
): IitcIrisMapLifetime {
  const controller = new AbortController();
  const timers = new Set<number>();
  const frames = new Set<number>();

  const stop = (removeMap: boolean): void => {
    if (controller.signal.aborted) return;
    controller.abort();
    for (const timer of timers) window.clearTimeout(timer);
    for (const frame of frames) window.cancelAnimationFrame(frame);
    timers.clear();
    frames.clear();
    map.off('unload', onUnload);
    try {
      onDispose();
    } finally {
      if (removeMap) map.remove();
    }
  };
  const onUnload = (): void => stop(false);
  map.on('unload', onUnload);

  return {
    signal: controller.signal,
    schedule(callback, delayMs): number | undefined {
      if (controller.signal.aborted) return undefined;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!controller.signal.aborted) callback();
      }, delayMs);
      timers.add(timer);
      return timer;
    },
    cancelScheduled(timer): void {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timers.delete(timer);
    },
    requestFrame(callback): number | undefined {
      if (controller.signal.aborted) return undefined;
      const frame = window.requestAnimationFrame((timestamp) => {
        frames.delete(frame);
        if (!controller.signal.aborted) callback(timestamp);
      });
      frames.add(frame);
      return frame;
    },
    async fetchText(url, init = {}): Promise<{response: Response; text: string}> {
      // Link both lifetimes without requiring AbortSignal.any in older browsers.
      const request = new AbortController();
      const abort = (): void => request.abort();
      controller.signal.addEventListener('abort', abort, {once: true});
      init.signal?.addEventListener('abort', abort, {once: true});
      try {
        if (controller.signal.aborted || init.signal?.aborted) abort();
        request.signal.throwIfAborted();
        const response = await fetch(url, {...init, signal: request.signal});
        const text = await response.text();
        request.signal.throwIfAborted();
        return {response, text};
      } catch (error) {
        request.signal.throwIfAborted();
        throw error;
      } finally {
        controller.signal.removeEventListener('abort', abort);
        init.signal?.removeEventListener('abort', abort);
      }
    },
    dispose: () => stop(true),
  };
}
