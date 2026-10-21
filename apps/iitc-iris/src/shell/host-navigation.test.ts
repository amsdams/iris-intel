import {afterEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_HOST_BACK, installIitcIrisHostBack} from './host-navigation';

afterEach(() => vi.unstubAllGlobals());

describe('native host Back', () => {
  it('closes image, then panel, then selection, and leaves the plain map to the host', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    for (const [state, expected] of [
      [{portalImageOpen: true, activeSheet: 'portal', hasSelectedObject: true}, 'image'],
      [{portalImageOpen: false, activeSheet: 'inventory', hasSelectedObject: true}, 'sheet'],
      [{portalImageOpen: false, activeSheet: 'map', hasSelectedObject: true}, 'selection'],
      [{portalImageOpen: false, activeSheet: 'map', hasSelectedObject: false}, undefined],
    ] as const) {
      const calls: string[] = [];
      const dispose = installIitcIrisHostBack({...state,
        closePortalImage: () => calls.push('image'), closeSheets: () => calls.push('sheet'),
        clearSelection: () => calls.push('selection')});
      const event = new Event(IITC_IRIS_HOST_BACK, {cancelable: true});
      target.dispatchEvent(event);
      expect(calls).toEqual(expected ? [expected] : []);
      expect(event.defaultPrevented).toBe(Boolean(expected));
      dispose();
      const afterDispose = new Event(IITC_IRIS_HOST_BACK, {cancelable: true});
      target.dispatchEvent(afterDispose);
      expect(afterDispose.defaultPrevented).toBe(false);
    }
  });
});
