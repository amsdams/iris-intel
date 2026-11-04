/** Page activity for automatic map/COMM work; listeners end with the current map. */
export function createMapRefreshActivity(signal: AbortSignal, onResume: () => void): {isIdle: () => boolean} {
  const MAX_IDLE_MS = 15 * 60_000;
  let lastActivity = Date.now();
  let hidden = document.hidden;
  let pointer: {x: number; y: number} | undefined;
  const isIdle = (): boolean => hidden || Date.now() - lastActivity >= MAX_IDLE_MS;
  const resume = (): void => {
    const wasIdle = isIdle();
    hidden = document.hidden;
    lastActivity = Date.now();
    if (wasIdle && !hidden && !signal.aborted) onResume();
  };
  const move = (event: PointerEvent): void => {
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <= 3) return;
    pointer = {x: event.clientX, y: event.clientY};
    resume();
  };
  const visibility = (): void => {
    if (document.hidden) hidden = true;
    else resume();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerdown', resume);
  document.addEventListener('keydown', resume);
  document.addEventListener('visibilitychange', visibility);
  signal.addEventListener('abort', () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerdown', resume);
    document.removeEventListener('keydown', resume);
    document.removeEventListener('visibilitychange', visibility);
  }, {once: true});
  return {isIdle};
}
