import {describe, expect, it, vi} from 'vitest';
import {
  addCommNicknameCommand,
  centerMapContextCommand,
  clearPortalSelectionCommand,
  clearSearchCommand,
  copyMapContextGuidCommand,
  copyMapContextLatLngCommand,
  copyMapContextPortalGuidsCommand,
  copyMapContextUrlCommand,
  copySelectedPortalGuidCommand,
  copySelectedPortalLinkCommand,
  copySelectedPortalTitleCommand,
  focusSelectedPortalCommand,
  handleSearchKeyDownCommand,
  moveSearchSelectionCommand,
  panMapCommand,
  previewSearchResultCommand,
  redeemPasscodeCommand,
  refreshInventoryCommand,
  refreshMissionsCommand,
  refreshScoresCommand,
  requestMissionDetailsCommand,
  requestSearchCommand,
  selectActiveSearchResultCommand,
  selectMapContextAnchorCommand,
  selectPortalByLatLngCommand,
  selectSearchResultCommand,
  sendCommCommand,
  setMapViewCommand,
  setPortalSectionOpenCommand,
  zoomToAndShowPortalCommand,
  zoomToMissionCommand,
  applySheetNavigationEffectCommand,
  closeSheetToMapCommand,
  logoutIntelCommand,
  openIntelLoginCommand,
  openCommPanelCommand,
  openSheetCommand,
  selectCommTabCommand,
  toggleCommPanelCommand,
  toggleMissionsSheetCommand,
  togglePrimaryMenuCommand,
  toggleSheetCommand,
  setDataSourceCommand,
  type SheetNavigationSetters,
} from './content-command-callbacks';
import {IITC_IRIS_MESSAGES} from './messages';
import type {IitcIrisSearchResult, IitcIrisSearchState, IitcIrisSelectedPortal} from './messages';
import type {IitcIrisMapContextSelection} from './selection-lifecycle';
import type {PortalSectionId} from './content-portal-selection-actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_SEARCH_STATE: IitcIrisSearchState = {
  status: 'idle',
  term: '',
  confirmed: false,
  results: [],
  localResults: 0,
};

function makePortalResult(overrides?: Partial<IitcIrisSearchResult>): IitcIrisSearchResult {
  return {id: 'p1', type: 'portal', title: 'Test Portal', lat: 52.3, lng: 4.9, guid: 'test-guid', ...overrides};
}

function makeSelectedPortal(overrides?: Partial<IitcIrisSelectedPortal>): IitcIrisSelectedPortal {
  return {
    guid: 'guid-xyz',
    title: 'Portal Title',
    team: 'R',
    latE6: 52367600,
    lngE6: 4904100,
    level: 8,
    health: 100,
    resCount: 8,
    isPlaceholder: false,
    ornaments: [],
    artifacts: [],
    links: {count: 0, incoming: 0, outgoing: 0, guids: []},
    fields: {count: 0, guids: []},
    ...overrides,
  };
}

function makeMapContext(overrides?: Partial<IitcIrisMapContextSelection>): IitcIrisMapContextSelection {
  return {lat: 52.37, lng: 4.89, zoom: 14, target: 'map', ...overrides};
}

// ---------------------------------------------------------------------------
// Checkpoint 1 — Simple panel-request commands
// ---------------------------------------------------------------------------

describe('content-command-callbacks', () => {
  describe('refreshScoresCommand', () => {
    it('posts a requestScores message', () => {
      const postMessage = vi.fn();
      refreshScoresCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.requestScores});
    });
  });

  describe('refreshInventoryCommand', () => {
    it('posts a requestInventory message', () => {
      const postMessage = vi.fn();
      refreshInventoryCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.requestInventory});
    });
  });

  describe('refreshMissionsCommand', () => {
    it('posts a requestMissions message with the given source', () => {
      const postMessage = vi.fn();
      refreshMissionsCommand(postMessage, 'portal');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissions,
        missionSource: 'portal',
      });
    });

    it('posts a requestMissions message with view source', () => {
      const postMessage = vi.fn();
      refreshMissionsCommand(postMessage, 'view');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissions,
        missionSource: 'view',
      });
    });
  });

  describe('requestMissionDetailsCommand', () => {
    it('posts a requestMissionDetails message with the given guid', () => {
      const postMessage = vi.fn();
      requestMissionDetailsCommand(postMessage, 'mission-abc');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissionDetails,
        missionGuid: 'mission-abc',
      });
    });
  });

  describe('zoomToMissionCommand', () => {
    it('posts a missionZoom message', () => {
      const postMessage = vi.fn();
      zoomToMissionCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.missionZoom});
    });
  });

  // -------------------------------------------------------------------------
  // redeemPasscodeCommand
  // -------------------------------------------------------------------------

  describe('redeemPasscodeCommand', () => {
    it('posts passcode message and sets draft when valid', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'idle', requestState: 'idle'},
        '  ABC123  ',
        setDraft,
        postMessage,
      );
      expect(result).toBe(true);
      // setDraft is called (with trimmed value) before postMessage
      expect(setDraft).toHaveBeenCalledWith('ABC123');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestPasscode,
        passcodeText: 'ABC123',
      });
      const setDraftOrder = setDraft.mock.invocationCallOrder[0];
      const postMessageOrder = postMessage.mock.invocationCallOrder[0];
      expect(setDraftOrder).toBeLessThan(postMessageOrder);
    });

    it('is a no-op when the draft is empty', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'idle', requestState: 'idle'},
        '   ',
        setDraft,
        postMessage,
      );
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });

    it('is a no-op when passcode is loading', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'loading', requestState: 'loading'},
        'VALIDCODE',
        setDraft,
        postMessage,
      );
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sendCommCommand
  // -------------------------------------------------------------------------

  describe('sendCommCommand', () => {
    it('posts send-comm message and clears draft when draft is non-empty', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('all', 'hello agent', setDraft, postMessage);
      expect(result).toBe(true);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.sendComm,
        commTab: 'all',
        commMessage: 'hello agent',
      });
      expect(setDraft).toHaveBeenCalledWith('');
    });

    it('is a no-op when the draft is empty or whitespace-only', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('faction', '   ', setDraft, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });

    it('is a no-op when the tab is alerts', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('alerts', 'hello', setDraft, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // addCommNicknameCommand
  // -------------------------------------------------------------------------

  describe('addCommNicknameCommand', () => {
    it('appends @nickname to the current draft', () => {
      expect(addCommNicknameCommand('hi ', 'agent1')).toBe('hi @agent1 ');
    });

    it('strips a leading @ from the supplied nickname', () => {
      expect(addCommNicknameCommand('', '@AgentX')).toBe('@AgentX ');
    });

    it('returns the current draft unchanged for an empty nickname', () => {
      expect(addCommNicknameCommand('hello', '')).toBe('hello');
    });

    it('trims leading whitespace from the result when the draft was empty', () => {
      expect(addCommNicknameCommand('', 'AgentY')).toBe('@AgentY ');
    });
  });

  // -------------------------------------------------------------------------
  // Checkpoint 2 — Search commands
  // -------------------------------------------------------------------------

  describe('requestSearchCommand', () => {
    it('posts a searchRequest message with confirmed=false by default', () => {
      const postMessage = vi.fn();
      requestSearchCommand(postMessage, 'damrak');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchRequest,
        searchTerm: 'damrak',
        searchConfirmed: false,
      });
    });

    it('posts a searchRequest message with confirmed=true when specified', () => {
      const postMessage = vi.fn();
      requestSearchCommand(postMessage, 'test', true);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchRequest,
        searchTerm: 'test',
        searchConfirmed: true,
      });
    });
  });

  describe('clearSearchCommand', () => {
    it('resets all search state setters and posts searchClear', () => {
      const postMessage = vi.fn();
      const setSearchTerm = vi.fn();
      const setSearchState = vi.fn();
      const setIndex = vi.fn();

      clearSearchCommand(postMessage, setSearchTerm, setSearchState, setIndex, EMPTY_SEARCH_STATE);

      expect(setSearchTerm).toHaveBeenCalledWith('');
      expect(setSearchState).toHaveBeenCalledWith(EMPTY_SEARCH_STATE);
      expect(setIndex).toHaveBeenCalledWith(0);
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.searchClear});
    });
  });

  describe('previewSearchResultCommand', () => {
    it('posts a searchPreview message with the given result', () => {
      const postMessage = vi.fn();
      const result = makePortalResult();
      previewSearchResultCommand(postMessage, result);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchPreview,
        searchResult: result,
      });
    });

    it('posts searchPreview with undefined result when null is passed', () => {
      const postMessage = vi.fn();
      previewSearchResultCommand(postMessage, null);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchPreview,
        searchResult: undefined,
      });
    });
  });

  describe('selectSearchResultCommand', () => {
    it('posts searchSelect and opens portal sheet for a portal result', () => {
      const postMessage = vi.fn();
      const closeSheets = vi.fn();
      const openSheet = vi.fn();
      const result = makePortalResult();

      selectSearchResultCommand(result, false, postMessage, false, closeSheets, openSheet);

      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchSelect,
        searchResult: result,
        searchZoom: false,
      });
      expect(openSheet).toHaveBeenCalledWith('portal');
      expect(closeSheets).not.toHaveBeenCalled();
    });

    it('posts searchSelect and opens portal sheet for a guid result', () => {
      const postMessage = vi.fn();
      const openSheet = vi.fn();
      const result = makePortalResult({type: 'guid', guid: 'some-guid'});

      selectSearchResultCommand(result, false, postMessage, false, vi.fn(), openSheet);

      expect(openSheet).toHaveBeenCalledWith('portal');
    });

    it('posts searchSelect but does not open portal sheet for address results', () => {
      const postMessage = vi.fn();
      const openSheet = vi.fn();
      const result: IitcIrisSearchResult = {id: 'a1', type: 'address', title: 'Amsterdam', lat: 52.37, lng: 4.89};

      selectSearchResultCommand(result, false, postMessage, false, vi.fn(), openSheet);

      expect(postMessage).toHaveBeenCalledOnce();
      expect(openSheet).not.toHaveBeenCalled();
    });

    it('closes sheets instead of opening portal sheet when in map-focus mode', () => {
      const postMessage = vi.fn();
      const closeSheets = vi.fn();
      const openSheet = vi.fn();
      const result = makePortalResult();

      selectSearchResultCommand(result, false, postMessage, true, closeSheets, openSheet);

      expect(closeSheets).toHaveBeenCalledOnce();
      expect(openSheet).not.toHaveBeenCalled();
    });

    it('passes zoom=true when specified', () => {
      const postMessage = vi.fn();
      const result = makePortalResult();

      selectSearchResultCommand(result, true, postMessage, false, vi.fn(), vi.fn());

      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({searchZoom: true}));
    });

    it('is a no-op for empty results', () => {
      const postMessage = vi.fn();
      const emptyResult: IitcIrisSearchResult = {id: 'e1', type: 'empty', title: 'No match', description: 'None'};

      selectSearchResultCommand(emptyResult, false, postMessage, false, vi.fn(), vi.fn());

      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  describe('moveSearchSelectionCommand', () => {
    it('calls setIndex with an updater that wraps forward', () => {
      const setIndex = vi.fn();
      const results: IitcIrisSearchResult[] = [makePortalResult(), makePortalResult({id: 'p2'})];

      moveSearchSelectionCommand(1, results, setIndex);

      const updater = setIndex.mock.calls[0][0] as (c: number) => number;
      expect(updater(0)).toBe(1);
      expect(updater(1)).toBe(0); // wraps
    });

    it('calls setIndex with an updater that wraps backward', () => {
      const setIndex = vi.fn();
      const results: IitcIrisSearchResult[] = [makePortalResult(), makePortalResult({id: 'p2'})];

      moveSearchSelectionCommand(-1, results, setIndex);

      const updater = setIndex.mock.calls[0][0] as (c: number) => number;
      expect(updater(0)).toBe(1); // wraps from 0 to last
    });

    it('skips empty-type results when moving', () => {
      const setIndex = vi.fn();
      const results: IitcIrisSearchResult[] = [
        {id: 'e1', type: 'empty', title: 'No match', description: 'None'},
        makePortalResult(),
        makePortalResult({id: 'p2'}),
      ];

      moveSearchSelectionCommand(1, results, setIndex);

      const updater = setIndex.mock.calls[0][0] as (c: number) => number;
      // 2 selectable items, wraps at 2
      expect(updater(1)).toBe(0);
    });
  });

  describe('selectActiveSearchResultCommand', () => {
    it('returns false when there is no active result', () => {
      const postMessage = vi.fn();
      const result = selectActiveSearchResultCommand([], 0, false, postMessage, false, vi.fn(), vi.fn());
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
    });

    it('selects the active result and returns true', () => {
      const postMessage = vi.fn();
      const openSheet = vi.fn();
      const results: IitcIrisSearchResult[] = [makePortalResult()];

      const result = selectActiveSearchResultCommand(results, 0, false, postMessage, false, vi.fn(), openSheet);

      expect(result).toBe(true);
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: IITC_IRIS_MESSAGES.searchSelect,
      }));
    });

    it('skips empty results when resolving the active index', () => {
      const postMessage = vi.fn();
      const results: IitcIrisSearchResult[] = [
        {id: 'e1', type: 'empty', title: 'None', description: 'None'},
        makePortalResult(),
      ];
      // index 0 in the selectable (non-empty) subset → resolves to the portal
      const result = selectActiveSearchResultCommand(results, 0, false, postMessage, false, vi.fn(), vi.fn());
      expect(result).toBe(true);
    });
  });

  describe('handleSearchKeyDownCommand', () => {
    const noOp = vi.fn();

    it('calls moveSearchSelection and preventDefault on ArrowDown', () => {
      const setIndex = vi.fn();
      const event = {key: 'ArrowDown', shiftKey: false, preventDefault: vi.fn()};
      const results = [makePortalResult()];

      handleSearchKeyDownCommand(event, results, 0, vi.fn(), false, noOp, noOp, setIndex);

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(setIndex).toHaveBeenCalledOnce();
    });

    it('calls moveSearchSelection and preventDefault on ArrowUp', () => {
      const setIndex = vi.fn();
      const event = {key: 'ArrowUp', shiftKey: false, preventDefault: vi.fn()};
      const results = [makePortalResult()];

      handleSearchKeyDownCommand(event, results, 0, vi.fn(), false, noOp, noOp, setIndex);

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(setIndex).toHaveBeenCalledOnce();
    });

    it('selects active result and calls preventDefault on Enter when result exists', () => {
      const postMessage = vi.fn();
      const event = {key: 'Enter', shiftKey: false, preventDefault: vi.fn()};
      const results = [makePortalResult()];

      handleSearchKeyDownCommand(event, results, 0, postMessage, false, noOp, vi.fn(), vi.fn());

      expect(postMessage).toHaveBeenCalledOnce();
      expect(event.preventDefault).toHaveBeenCalledOnce();
    });

    it('does not call preventDefault on Enter when no result is active', () => {
      const event = {key: 'Enter', shiftKey: false, preventDefault: vi.fn()};

      handleSearchKeyDownCommand(event, [], 0, vi.fn(), false, noOp, noOp, vi.fn());

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('passes zoom=true to selectActiveSearchResult on Shift+Enter', () => {
      const postMessage = vi.fn();
      const event = {key: 'Enter', shiftKey: true, preventDefault: vi.fn()};
      const results = [makePortalResult()];

      handleSearchKeyDownCommand(event, results, 0, postMessage, false, noOp, vi.fn(), vi.fn());

      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({searchZoom: true}));
    });

    it('ignores unrelated keys', () => {
      const postMessage = vi.fn();
      const setIndex = vi.fn();
      const event = {key: 'Tab', shiftKey: false, preventDefault: vi.fn()};

      handleSearchKeyDownCommand(event, [makePortalResult()], 0, postMessage, false, noOp, noOp, setIndex);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(postMessage).not.toHaveBeenCalled();
      expect(setIndex).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Checkpoint 3 — Map, context, and portal commands
  // -------------------------------------------------------------------------

  describe('setMapViewCommand', () => {
    it('posts a setView message', () => {
      const postMessage = vi.fn();
      setMapViewCommand(52.37, 4.89, 14, postMessage);
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: IITC_IRIS_MESSAGES.setView,
        lat: 52.37,
        lng: 4.89,
        zoom: 14,
      }));
    });
  });

  describe('panMapCommand', () => {
    it('posts a panBy message with correct east offsets', () => {
      const postMessage = vi.fn();
      panMapCommand('east', 500, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.panBy,
        panX: 500,
        panY: 0,
      });
    });

    it('posts a panBy message with correct north offsets', () => {
      const postMessage = vi.fn();
      panMapCommand('north', 500, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.panBy,
        panX: 0,
        panY: -500,
      });
    });

    it('posts a panBy message with correct west offsets', () => {
      const postMessage = vi.fn();
      panMapCommand('west', 500, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.panBy,
        panX: -500,
        panY: 0,
      });
    });

    it('posts a panBy message with correct south offsets', () => {
      const postMessage = vi.fn();
      panMapCommand('south', 500, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.panBy,
        panX: 0,
        panY: 500,
      });
    });
  });

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

  describe('zoomToAndShowPortalCommand', () => {
    it('posts a zoomToAndShowPortal message with latE6/lngE6 conversion', () => {
      const postMessage = vi.fn();
      zoomToAndShowPortalCommand('guid-abc', 52367600, 4904100, 15, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
        portalGuid: 'guid-abc',
        portalLat: 52.3676,
        portalLng: 4.9041,
        zoom: 15,
      });
    });

    it('posts without guid and coordinates when both are undefined', () => {
      const postMessage = vi.fn();
      zoomToAndShowPortalCommand(undefined, undefined, undefined, 10, postMessage);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
        portalGuid: undefined,
        portalLat: undefined,
        portalLng: undefined,
        zoom: 10,
      });
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

  describe('selectPortalByLatLngCommand', () => {
    it('posts zoomToAndShowPortal when coords are defined', () => {
      const postMessage = vi.fn();
      const result = selectPortalByLatLngCommand(52367600, 4904100, 'guid-123', 12, postMessage);
      expect(result).toBe(true);
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      }));
    });

    it('is a no-op and returns false when latE6 is undefined', () => {
      const postMessage = vi.fn();
      const result = selectPortalByLatLngCommand(undefined, 4904100, 'guid-123', 12, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
    });

    it('is a no-op and returns false when lngE6 is undefined', () => {
      const postMessage = vi.fn();
      const result = selectPortalByLatLngCommand(52367600, undefined, 'guid-123', 12, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
    });

    it('uses at least zoom 15 even when camera zoom is lower', () => {
      const postMessage = vi.fn();
      selectPortalByLatLngCommand(52367600, 4904100, undefined, 5, postMessage);
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({zoom: 15}));
    });
  });

  describe('clearPortalSelectionCommand', () => {
    it('posts a clearPortalSelection message', () => {
      const postMessage = vi.fn();
      clearPortalSelectionCommand(postMessage);
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.clearPortalSelection});
    });
  });

  describe('focusSelectedPortalCommand', () => {
    it('calls setMapView for the selected portal', () => {
      const setMapView = vi.fn();
      const closeSheets = vi.fn();
      focusSelectedPortalCommand(makeSelectedPortal(), 14, false, setMapView, closeSheets);
      expect(setMapView).toHaveBeenCalledWith(52.3676, 4.9041, 17);
      expect(closeSheets).not.toHaveBeenCalled();
    });

    it('calls closeSheets in map-focus mode', () => {
      const setMapView = vi.fn();
      const closeSheets = vi.fn();
      focusSelectedPortalCommand(makeSelectedPortal(), 14, true, setMapView, closeSheets);
      expect(closeSheets).toHaveBeenCalledOnce();
    });

    it('is a no-op when selectedPortal is null', () => {
      const setMapView = vi.fn();
      focusSelectedPortalCommand(null, 14, false, setMapView, vi.fn());
      expect(setMapView).not.toHaveBeenCalled();
    });

    it('uses at least zoom 17 even when camera zoom is lower', () => {
      const setMapView = vi.fn();
      focusSelectedPortalCommand(makeSelectedPortal(), 10, false, setMapView, vi.fn());
      expect(setMapView).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 17);
    });
  });

  describe('setPortalSectionOpenCommand', () => {
    it('merges the new open state into the sections map', () => {
      const setPortalSections = vi.fn();
      const current: Record<PortalSectionId, boolean> = {mods: false, resonators: true, facts: true};
      setPortalSectionOpenCommand(current, 'mods', true, setPortalSections);
      expect(setPortalSections).toHaveBeenCalledWith({mods: true, resonators: true, facts: true});
    });

    it('does not mutate the current sections object', () => {
      const setPortalSections = vi.fn();
      const current: Record<PortalSectionId, boolean> = {mods: false, resonators: true, facts: true};
      setPortalSectionOpenCommand(current, 'mods', true, setPortalSections);
      expect(current.mods).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Copy commands (Checkpoint 3)
  // -------------------------------------------------------------------------

  describe('copy map context commands', () => {
    it('copyMapContextLatLngCommand is a no-op when context is null', () => {
      // No throw, no clipboard write (copyIitcIrisText would be called but context guard prevents it)
      expect(() => copyMapContextLatLngCommand(null, vi.fn())).not.toThrow();
    });

    it('copyMapContextUrlCommand is a no-op when context is null', () => {
      expect(() => copyMapContextUrlCommand(null, vi.fn())).not.toThrow();
    });

    it('copyMapContextGuidCommand is a no-op when context has no guid', () => {
      const setStatus = vi.fn();
      copyMapContextGuidCommand(makeMapContext({guid: undefined}), setStatus);
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('copyMapContextPortalGuidsCommand is a no-op when no portal guids are present', () => {
      const setStatus = vi.fn();
      copyMapContextPortalGuidsCommand(makeMapContext({portalGuids: []}), setStatus);
      expect(setStatus).not.toHaveBeenCalled();
    });
  });

  describe('copy selected portal commands', () => {
    it('copySelectedPortalLinkCommand is a no-op when portal is null', () => {
      const setStatus = vi.fn();
      copySelectedPortalLinkCommand(null, 14, setStatus);
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('copySelectedPortalGuidCommand is a no-op when portal is null', () => {
      const setStatus = vi.fn();
      copySelectedPortalGuidCommand(null, setStatus);
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('copySelectedPortalTitleCommand is a no-op when portal is null', () => {
      const setStatus = vi.fn();
      copySelectedPortalTitleCommand(null, setStatus);
      expect(setStatus).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Checkpoint 4 — Sheet/Menu/Auth/Data Source Commands
// ---------------------------------------------------------------------------

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
    expect(toggleSheet).toHaveBeenNthCalledWith(2, 'system');
  });
});

describe('setDataSourceCommand', () => {
  it('sets data source id and updates map view if fixture', () => {
    const setDataSourceId = vi.fn();
    const setMapView = vi.fn();
    const options = [{id: 'fixture-1', mode: 'fixture' as const, name: 'f1', lat: 10, lng: 20, zoom: 15}];
    setDataSourceCommand('fixture-1', options, setDataSourceId, setMapView);
    expect(setDataSourceId).toHaveBeenCalledWith('fixture-1');
    expect(setMapView).toHaveBeenCalledWith(10, 20, 15);
  });

  it('only sets data source id if live', () => {
    const setDataSourceId = vi.fn();
    const setMapView = vi.fn();
    const options = [{id: 'live', mode: 'live' as const, name: 'live'}];
    setDataSourceCommand('live', options, setDataSourceId, setMapView);
    expect(setDataSourceId).toHaveBeenCalledWith('live');
    expect(setMapView).not.toHaveBeenCalled();
  });
});

describe('Intel auth navigation command wrappers', () => {
  it('openIntelLoginCommand delegates to login redirect behavior', () => {
    const rootElement = {remove: vi.fn()} as unknown as HTMLElement;
    const location = {
      origin: 'https://intel.ingress.com',
      pathname: '/map',
      reload: vi.fn(),
      assign: vi.fn(),
    } as unknown as Location;

    openIntelLoginCommand('login-bypass', 300_000, rootElement, location);

    expect(rootElement.remove).toHaveBeenCalledOnce();
    expect(location.assign).toHaveBeenCalledWith('https://intel.ingress.com/intel');
  });

  it('logoutIntelCommand delegates to Intel logout redirect behavior', () => {
    const rootElement = {remove: vi.fn()} as unknown as HTMLElement;
    const location = {
      origin: 'https://intel.ingress.com',
      pathname: '/intel',
      reload: vi.fn(),
      assign: vi.fn(),
    } as unknown as Location;

    logoutIntelCommand('login-bypass', rootElement, location);

    expect(rootElement.remove).toHaveBeenCalledOnce();
    expect(location.assign).toHaveBeenCalledWith('https://intel.ingress.com/logout');
  });
});
