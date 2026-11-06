import {describe, expect, it, vi} from 'vitest';
import {
  centerMapContextCommand, selectMapContextAnchorCommand,
  openCommPanelCommand, selectCommTabCommand,
  toggleCommPanelCommand, toggleMissionsSheetCommand, togglePrimaryMenuCommand,
} from './content-command-callbacks';
import {IITC_IRIS_MESSAGES} from './messages';
import type {IitcIrisMapContextSelection} from './portals/selection-lifecycle';

function makeMapContext(overrides?: Partial<IitcIrisMapContextSelection>): IitcIrisMapContextSelection {
  return {lat: 52.37, lng: 4.89, zoom: 14, target: 'map', ...overrides};
}

describe('centerMapContextCommand', () => {
  it('calls setMapView with context coords', () => {
    const setMapView = vi.fn();
    const ctx = makeMapContext({lat: 52.37, lng: 4.89, zoom: 15});
    centerMapContextCommand(ctx, setMapView);
    expect(setMapView).toHaveBeenCalledWith(52.37, 4.89, 15);
  });

  it('is a no-op when mapContext is null', () => {
    const setMapView = vi.fn();
    centerMapContextCommand(null, setMapView);
    expect(setMapView).not.toHaveBeenCalled();
  });
});

describe('selectMapContextAnchorCommand', () => {
  it('posts a zoomToAndShowPortal message from anchor fields', () => {
    const postMessage = vi.fn();
    const anchor = {guid: 'anc-guid', label: 'Tower', latE6: 52367600, lngE6: 4904100};
    selectMapContextAnchorCommand(anchor, 15, postMessage);
    expect(postMessage).toHaveBeenCalledWith({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid: 'anc-guid',
      portalLat: 52.3676,
      portalLng: 4.9041,
      zoom: 15,
    });
  });
});

describe('openCommPanelCommand', () => {
  it('refreshes comm if tab is provided, then opens sheet', () => {
    const refreshComm = vi.fn();
    const openSheet = vi.fn();
    openCommPanelCommand('all', refreshComm, openSheet);
    expect(refreshComm).toHaveBeenCalledWith('all');
    expect(openSheet).toHaveBeenCalledWith('comm');
  });

  it('opens sheet without refreshing if tab is not provided', () => {
    const refreshComm = vi.fn();
    const openSheet = vi.fn();
    openCommPanelCommand(undefined, refreshComm, openSheet);
    expect(refreshComm).not.toHaveBeenCalled();
    expect(openSheet).toHaveBeenCalledWith('comm');
  });
});

describe('selectCommTabCommand', () => {
  it('is a no-op if already on comm sheet with the same tab', () => {
    const refreshComm = vi.fn();
    const openSheet = vi.fn();
    selectCommTabCommand('all', 'comm', 'all', refreshComm, openSheet);
    expect(refreshComm).not.toHaveBeenCalled();
    expect(openSheet).not.toHaveBeenCalled();
  });

  it('refreshes and does not open sheet if already on comm sheet but tab changes', () => {
    const refreshComm = vi.fn();
    const openSheet = vi.fn();
    selectCommTabCommand('alerts', 'comm', 'all', refreshComm, openSheet);
    expect(refreshComm).toHaveBeenCalledWith('alerts');
    expect(openSheet).not.toHaveBeenCalled();
  });

  it('refreshes and opens sheet if not on comm sheet', () => {
    const refreshComm = vi.fn();
    const openSheet = vi.fn();
    selectCommTabCommand('all', 'map', 'all', refreshComm, openSheet);
    expect(refreshComm).toHaveBeenCalledWith('all');
    expect(openSheet).toHaveBeenCalledWith('comm');
  });
});

describe('toggleCommPanelCommand', () => {
  it('closes to map if on comm sheet and tab matches', () => {
    const closeSheetToMap = vi.fn();
    const openCommPanel = vi.fn();
    toggleCommPanelCommand('all', 'comm', 'all', closeSheetToMap, openCommPanel);
    expect(closeSheetToMap).toHaveBeenCalled();
    expect(openCommPanel).not.toHaveBeenCalled();
  });

  it('closes to map if on comm sheet and no tab provided', () => {
    const closeSheetToMap = vi.fn();
    const openCommPanel = vi.fn();
    toggleCommPanelCommand(undefined, 'comm', 'all', closeSheetToMap, openCommPanel);
    expect(closeSheetToMap).toHaveBeenCalled();
    expect(openCommPanel).not.toHaveBeenCalled();
  });

  it('opens comm panel if not on comm sheet', () => {
    const closeSheetToMap = vi.fn();
    const openCommPanel = vi.fn();
    toggleCommPanelCommand('all', 'map', 'all', closeSheetToMap, openCommPanel);
    expect(closeSheetToMap).not.toHaveBeenCalled();
    expect(openCommPanel).toHaveBeenCalledWith('all');
  });

  it('opens comm panel if on comm sheet but tab differs', () => {
    const closeSheetToMap = vi.fn();
    const openCommPanel = vi.fn();
    toggleCommPanelCommand('alerts', 'comm', 'all', closeSheetToMap, openCommPanel);
    expect(closeSheetToMap).not.toHaveBeenCalled();
    expect(openCommPanel).toHaveBeenCalledWith('alerts');
  });
});

describe('toggleMissionsSheetCommand', () => {
  it('closes to map if already on missions sheet with same source', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const refreshMissions = vi.fn();
    toggleMissionsSheetCommand('portal', 'missions', 'portal', closeSheetToMap, openSheet, refreshMissions);
    expect(closeSheetToMap).toHaveBeenCalled();
    expect(openSheet).not.toHaveBeenCalled();
    expect(refreshMissions).not.toHaveBeenCalled();
  });

  it('opens and refreshes if not on missions sheet', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const refreshMissions = vi.fn();
    toggleMissionsSheetCommand('view', 'map', 'portal', closeSheetToMap, openSheet, refreshMissions);
    expect(closeSheetToMap).not.toHaveBeenCalled();
    expect(openSheet).toHaveBeenCalledWith('missions');
    expect(refreshMissions).toHaveBeenCalledWith('view');
  });

  it('opens and refreshes if on missions sheet but source differs', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const refreshMissions = vi.fn();
    toggleMissionsSheetCommand('view', 'missions', 'portal', closeSheetToMap, openSheet, refreshMissions);
    expect(closeSheetToMap).not.toHaveBeenCalled();
    expect(openSheet).toHaveBeenCalledWith('missions');
    expect(refreshMissions).toHaveBeenCalledWith('view');
  });
});

describe('togglePrimaryMenuCommand', () => {
  it('routes map primary menu close effect', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const toggleCommPanel = vi.fn();
    const toggleSheet = vi.fn();
    togglePrimaryMenuCommand(
      'map',
      {activePrimaryMenu: 'map', activeSelectedSheet: 'portal', activeSheet: 'view', hasSelectedObject: true},
      closeSheetToMap,
      openSheet,
      toggleCommPanel,
      toggleSheet
    );
    expect(closeSheetToMap).toHaveBeenCalledOnce();
    expect(openSheet).not.toHaveBeenCalled();
    expect(toggleCommPanel).not.toHaveBeenCalled();
    expect(toggleSheet).not.toHaveBeenCalled();
  });

  it('routes map primary menu open effect', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const toggleCommPanel = vi.fn();
    const toggleSheet = vi.fn();
    togglePrimaryMenuCommand(
      'map',
      {activePrimaryMenu: 'map', activeSelectedSheet: 'portal', activeSheet: 'map', hasSelectedObject: true},
      closeSheetToMap,
      openSheet,
      toggleCommPanel,
      toggleSheet
    );
    expect(openSheet).toHaveBeenCalledWith('layers');
    expect(closeSheetToMap).not.toHaveBeenCalled();
  });

  it('routes selected primary menu toggle effect', () => {
    const toggleSheet = vi.fn();
    togglePrimaryMenuCommand(
      'selected',
      {activePrimaryMenu: 'map', activeSelectedSheet: 'selectedLink', activeSheet: 'map', hasSelectedObject: true},
      vi.fn(),
      vi.fn(),
      vi.fn(),
      toggleSheet
    );
    expect(toggleSheet).toHaveBeenCalledWith('selectedLink');
  });

  it('does nothing for selected primary menu without a selected object', () => {
    const closeSheetToMap = vi.fn();
    const openSheet = vi.fn();
    const toggleCommPanel = vi.fn();
    const toggleSheet = vi.fn();
    togglePrimaryMenuCommand(
      'selected',
      {activePrimaryMenu: 'map', activeSelectedSheet: 'portal', activeSheet: 'map', hasSelectedObject: false},
      closeSheetToMap,
      openSheet,
      toggleCommPanel,
      toggleSheet
    );
    expect(closeSheetToMap).not.toHaveBeenCalled();
    expect(openSheet).not.toHaveBeenCalled();
    expect(toggleCommPanel).not.toHaveBeenCalled();
    expect(toggleSheet).not.toHaveBeenCalled();
  });

  it('routes comm primary menu effect', () => {
    const toggleCommPanel = vi.fn();
    togglePrimaryMenuCommand(
      'comm',
      {activePrimaryMenu: 'map', activeSelectedSheet: 'portal', activeSheet: 'map', hasSelectedObject: true},
      vi.fn(),
      vi.fn(),
      toggleCommPanel,
      vi.fn()
    );
    expect(toggleCommPanel).toHaveBeenCalledOnce();
  });

  it('routes agent and system primary menus to sheet toggles', () => {
    const toggleSheet = vi.fn();
    const context = {activePrimaryMenu: 'map' as const, activeSelectedSheet: 'portal' as const, activeSheet: 'map' as const, hasSelectedObject: true};
    togglePrimaryMenuCommand('agent', context, vi.fn(), vi.fn(), vi.fn(), toggleSheet);
    togglePrimaryMenuCommand('system', context, vi.fn(), vi.fn(), vi.fn(), toggleSheet);
    expect(toggleSheet).toHaveBeenNthCalledWith(1, 'agent');
    expect(toggleSheet).toHaveBeenNthCalledWith(2, 'appearance');
  });
});
