import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../messages';
import type {IitcIrisSheetId} from './menu-registry';
import {useShellNavigation, useShellNavigationEffects} from './use-shell-navigation';

interface HostProps {isPanelVisible?: (sheet: IitcIrisSheetId) => boolean}

describe('shell navigation ownership', () => {
  let root: Element;
  let navigation: ReturnType<typeof useShellNavigation>;
  let stored: Map<string, string>;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();
  const visible = (sheet: IitcIrisSheetId): boolean => sheet !== 'portalCounts';
  const focus = vi.fn();

  function Host({isPanelVisible = visible}: HostProps): null {
    navigation = useShellNavigation(postMessage, isPanelVisible);
    useShellNavigationEffects(navigation);
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    postMessage.mockReset();
    stored = new Map();
    frames = new Map();
    nextFrame = 0;
    vi.stubGlobal('document', {querySelector: () => ({focus})});
    vi.stubGlobal('window', {
      localStorage: {getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key)},
      requestAnimationFrame: (callback: FrameRequestCallback) => {frames.set(++nextFrame, callback); return nextFrame;},
      cancelAnimationFrame: (id: number) => frames.delete(id),
    });
    root = {firstChild: null, childNodes: []} as unknown as Element;
  });
  afterEach(async () => {
    await act(() => render(null, root));
    vi.unstubAllGlobals();
  });

  it('restores the panel and persists transitions while cancelling requests before leaving a side panel', async () => {
    stored.set('iitc-iris:active-sheet', 'inventory');
    await act(() => render(h<HostProps>(Host, {}), root));
    expect(navigation.activeSheet).toBe('inventory');
    expect(navigation.activeSidePanel).toBe('inventory');
    const savedAtCancel: string[] = [];
    postMessage.mockImplementation(() => {savedAtCancel.push(stored.get('iitc-iris:active-sheet') ?? '');});
    await act(() => navigation.openSheet('layers'));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({type: IITC_IRIS_MESSAGES.cancelPanelRequests});
    expect(savedAtCancel).toEqual(['inventory']);
    expect(navigation.activeSheet).toBe('layers');
    expect(navigation.activeSidePanel).toBeNull();
    expect(stored.get('iitc-iris:active-sheet')).toBe('layers');
    postMessage.mockClear();
    await act(() => navigation.toggleSheet('layers'));
    expect(navigation.activeSheet).toBe('map');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects hidden sheets and closes an open sheet when its visibility changes', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => navigation.openSheet('portalCounts'));
    await act(() => navigation.toggleSheet('portalCounts'));
    expect(navigation.activeSheet).toBe('map');
    await act(() => navigation.openSheet('portalsList'));
    expect(navigation.activeSheet).toBe('portalsList');
    await act(() => render(h<HostProps>(Host, {isPanelVisible: sheet => visible(sheet) && sheet !== 'portalsList'}), root));
    expect(navigation.activeSheet).toBe('map');
    expect(stored.get('iitc-iris:active-sheet')).toBe('map');
  });

  it('closes image and sheet together while leaving the panel cancellation path intact', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => {navigation.openSheet('comm'); navigation.setPortalImageOpen(true);});
    expect(navigation.portalImageOpen).toBe(true);
    await act(() => navigation.closeSheets());
    expect(navigation.portalImageOpen).toBe(false);
    expect(navigation.activeSheet).toBe('map');
    expect(navigation.activeSidePanel).toBeNull();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({type: IITC_IRIS_MESSAGES.cancelPanelRequests});
  });

  it('preserves a newly requested focus when pending mount effects flush during navigation', async () => {
    render(h<HostProps>(Host, {}), root);
    navigation.openSearch();
    await act(() => undefined);
    expect(navigation.activeSheet).toBe('search');
    expect(frames.size).toBe(1);
    const callback = [...frames.values()][0];
    callback(0);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('focuses search after rendering, replaces a pending focus frame and cancels it on unmount', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => {navigation.openSearch(); navigation.openSearch();});
    expect(navigation.activeSheet).toBe('search');
    expect(focus).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    const [id, callback] = [...frames][0];
    frames.delete(id);
    callback(0);
    expect(focus).toHaveBeenCalledOnce();
    await act(() => navigation.openSearch());
    expect(frames.size).toBe(1);
    await act(() => navigation.closeSheets());
    expect(frames.size).toBe(0);
    await act(() => navigation.openSearch());
    await act(() => navigation.setActiveSheet('portal'));
    expect(frames.size).toBe(0);
    await act(() => navigation.openSearch());
    expect(frames.size).toBe(1);
    await act(() => render(null, root));
    expect(frames.size).toBe(0);
    expect(focus).toHaveBeenCalledOnce();
  });
});
