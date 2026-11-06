import {describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES} from '../messages';
import {applySheetNavigationEffectCommand, closeSheetToMapCommand, openSheetCommand, toggleSheetCommand,
  type SheetNavigationSetters} from './sheet-navigation-actions';

describe('applySheetNavigationEffectCommand', () => {
  it('applies effect and posts cancel message if requested', () => {
    const postMessage = vi.fn();
    const setters = {
      setActiveSheet: vi.fn(),
      setActiveSidePanel: vi.fn(),
      storeActiveSheet: vi.fn(),
      storeSidePanelId: vi.fn(),
    };
    applySheetNavigationEffectCommand(
      {activeSheet: 'comm', activeSidePanel: 'comm', cancelPanelRequests: true},
      postMessage,
      setters,
      'side-panel-first'
    );
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({type: IITC_IRIS_MESSAGES.cancelPanelRequests}));
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith('comm');
    expect(setters.setActiveSheet).toHaveBeenCalledWith('comm');
    expect(setters.storeSidePanelId).toHaveBeenCalledWith('comm');
    expect(setters.storeActiveSheet).toHaveBeenCalledWith('comm');
    expect(postMessage.mock.invocationCallOrder[0]).toBeLessThan(setters.setActiveSidePanel.mock.invocationCallOrder[0]);
    expect(setters.setActiveSidePanel.mock.invocationCallOrder[0]).toBeLessThan(setters.setActiveSheet.mock.invocationCallOrder[0]);
  });

  it('does not post cancel message if not requested', () => {
    const postMessage = vi.fn();
    const setters = {
      setActiveSheet: vi.fn(),
      setActiveSidePanel: vi.fn(),
      storeActiveSheet: vi.fn(),
      storeSidePanelId: vi.fn(),
    };
    applySheetNavigationEffectCommand(
      {activeSheet: 'map', activeSidePanel: null, cancelPanelRequests: false},
      postMessage,
      setters,
      'side-panel-first'
    );
    expect(postMessage).not.toHaveBeenCalled();
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith(null);
    expect(setters.storeSidePanelId).toHaveBeenCalledWith(null);
  });

  it('can apply sheet-first ordering for open/toggle sheet paths', () => {
    const postMessage = vi.fn();
    const setters = {
      setActiveSheet: vi.fn(),
      setActiveSidePanel: vi.fn(),
      storeActiveSheet: vi.fn(),
      storeSidePanelId: vi.fn(),
    };
    applySheetNavigationEffectCommand(
      {activeSheet: 'layers', activeSidePanel: null, cancelPanelRequests: true},
      postMessage,
      setters,
      'sheet-first'
    );
    expect(setters.setActiveSheet).toHaveBeenCalledWith('layers');
    expect(setters.storeActiveSheet).toHaveBeenCalledWith('layers');
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith(null);
    expect(setters.storeSidePanelId).toHaveBeenCalledWith(null);
    expect(postMessage.mock.invocationCallOrder[0]).toBeLessThan(setters.setActiveSheet.mock.invocationCallOrder[0]);
    expect(setters.setActiveSheet.mock.invocationCallOrder[0]).toBeLessThan(setters.storeActiveSheet.mock.invocationCallOrder[0]);
    expect(setters.storeActiveSheet.mock.invocationCallOrder[0]).toBeLessThan(setters.setActiveSidePanel.mock.invocationCallOrder[0]);
  });
});

describe('sheet navigation commands', () => {
  type MockSheetNavigationSetters = SheetNavigationSetters & {
    setActiveSheet: ReturnType<typeof vi.fn>;
    setActiveSidePanel: ReturnType<typeof vi.fn>;
    storeActiveSheet: ReturnType<typeof vi.fn>;
    storeSidePanelId: ReturnType<typeof vi.fn>;
  };

  function makeSheetSetters(): MockSheetNavigationSetters {
    return {
      setActiveSheet: vi.fn(),
      setActiveSidePanel: vi.fn(),
      storeActiveSheet: vi.fn(),
      storeSidePanelId: vi.fn(),
    } as unknown as MockSheetNavigationSetters;
  }

  it('closeSheetToMapCommand closes side panels and cancels panel requests', () => {
    const postMessage = vi.fn();
    const setters = makeSheetSetters();
    closeSheetToMapCommand('comm', 'comm', postMessage, setters);
    expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.cancelPanelRequests});
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith(null);
    expect(setters.setActiveSheet).toHaveBeenCalledWith('map');
    expect(setters.storeSidePanelId).toHaveBeenCalledWith(null);
    expect(setters.storeActiveSheet).toHaveBeenCalledWith('map');
  });

  it('openSheetCommand opens side panels without cancellation', () => {
    const postMessage = vi.fn();
    const setters = makeSheetSetters();
    openSheetCommand('inventory', 'map', null, postMessage, setters);
    expect(postMessage).not.toHaveBeenCalled();
    expect(setters.setActiveSheet).toHaveBeenCalledWith('inventory');
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith('inventory');
  });

  it('openSheetCommand cancels active side-panel requests before opening non-panel sheets', () => {
    const postMessage = vi.fn();
    const setters = makeSheetSetters();
    openSheetCommand('layers', 'comm', 'comm', postMessage, setters);
    expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.cancelPanelRequests});
    expect(setters.setActiveSheet).toHaveBeenCalledWith('layers');
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith(null);
  });

  it('toggleSheetCommand closes an active sheet using sheet-first ordering', () => {
    const postMessage = vi.fn();
    const setters = makeSheetSetters();
    toggleSheetCommand('inventory', 'inventory', 'inventory', postMessage, setters);
    expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.cancelPanelRequests});
    expect(setters.setActiveSheet).toHaveBeenCalledWith('map');
    expect(setters.storeActiveSheet).toHaveBeenCalledWith('map');
    expect(setters.setActiveSidePanel).toHaveBeenCalledWith(null);
    expect(setters.storeSidePanelId).toHaveBeenCalledWith(null);
    expect(postMessage.mock.invocationCallOrder[0]).toBeLessThan(setters.setActiveSheet.mock.invocationCallOrder[0]);
  });
});
