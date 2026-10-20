import {describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisSearchResult, type IitcIrisSearchState} from '../../messages';
import {
  requestSearchCommand,
  clearSearchCommand,
  previewSearchResultCommand,
  selectSearchResultCommand,
  moveSearchSelectionCommand,
  selectActiveSearchResultCommand,
  handleSearchKeyDownCommand,
} from './commands';

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

describe('Search commands', () => {
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

});
