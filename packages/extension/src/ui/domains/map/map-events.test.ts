import {describe, expect, it, vi} from 'vitest';
import {emitPortalClick, installPortalSelectionBridge} from './map-events';

class FakeTarget {
  private listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const current = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    if (typeof listener === 'function') {
      current.add(listener as (event: Event) => void);
    }
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (typeof listener === 'function') {
      this.listeners.get(type)?.delete(listener as (event: Event) => void);
    }
  }

  dispatchEvent(event: Event): boolean {
    const typedEvent = event as Event & { detail?: { id?: string } };
    const type = typedEvent.type;
    if (!type) return true;
    this.listeners.get(type)?.forEach((listener) => listener(event));
    return true;
  }
}

describe('installPortalSelectionBridge', () => {
  it('selects the portal and posts a detail request when a portal click event is emitted', () => {
    const target = new FakeTarget();
    const selectPortal = vi.fn();
    const postMessage = vi.fn();

    const cleanup = installPortalSelectionBridge({
      target,
      windowLike: { postMessage },
      selectPortal,
    });

    emitPortalClick(target, 'portal-123');

    expect(selectPortal).toHaveBeenCalledWith('portal-123');
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: 'portal-123' },
      '*'
    );

    cleanup();
  });
});
