import {describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisSearchResult, type IitcIrisSearchState} from '../../messages';
import {
  requestSearchCommand,
  clearSearchCommand,
  previewSearchResultCommand,
  selectSearchResultCommand,
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

      selectSearchResultCommand(result, postMessage, false, closeSheets, openSheet);

      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.searchSelect,
        searchResult: result,
      });
      expect(openSheet).toHaveBeenCalledWith('portal');
      expect(closeSheets).not.toHaveBeenCalled();
    });

    it('posts searchSelect and opens portal sheet for a guid result', () => {
      const postMessage = vi.fn();
      const openSheet = vi.fn();
      const result = makePortalResult({type: 'guid', guid: 'some-guid'});

      selectSearchResultCommand(result, postMessage, false, vi.fn(), openSheet);

      expect(openSheet).toHaveBeenCalledWith('portal');
    });

    it('posts searchSelect but does not open portal sheet for address results', () => {
      const postMessage = vi.fn();
      const openSheet = vi.fn();
      const result: IitcIrisSearchResult = {id: 'a1', type: 'address', title: 'Amsterdam', lat: 52.37, lng: 4.89};

      selectSearchResultCommand(result, postMessage, false, vi.fn(), openSheet);

      expect(postMessage).toHaveBeenCalledOnce();
      expect(openSheet).not.toHaveBeenCalled();
    });

    it('closes sheets instead of opening portal sheet when in map-focus mode', () => {
      const postMessage = vi.fn();
      const closeSheets = vi.fn();
      const openSheet = vi.fn();
      const result = makePortalResult();

      selectSearchResultCommand(result, postMessage, true, closeSheets, openSheet);

      expect(closeSheets).toHaveBeenCalledOnce();
      expect(openSheet).not.toHaveBeenCalled();
    });

    it('is a no-op for empty results', () => {
      const postMessage = vi.fn();
      const emptyResult: IitcIrisSearchResult = {id: 'e1', type: 'empty', title: 'No match', description: 'None'};

      selectSearchResultCommand(emptyResult, postMessage, false, vi.fn(), vi.fn());

      expect(postMessage).not.toHaveBeenCalled();
    });
  });

});
