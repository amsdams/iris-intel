import {describe, expect, it} from 'vitest';
import {
  buildSearchClearMessage,
  buildSearchPreviewMessage,
  buildSearchRequestMessage,
  buildSearchSelectMessage,
  calculateNextSearchResultIndex,
  getActiveSearchResult,
} from './content-search-actions';
import type {IitcIrisSearchResult} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';

describe('content-search-actions', () => {
  const portalResult: IitcIrisSearchResult = {
    id: 'p1',
    type: 'portal',
    title: 'Test Portal',
    lat: 52.3,
    lng: 4.9,
    guid: 'test-guid',
  };

  it('builds search request message', () => {
    expect(buildSearchRequestMessage('test', true)).toEqual({
      type: IITC_IRIS_MESSAGES.searchRequest,
      searchTerm: 'test',
      searchConfirmed: true,
    });
  });

  it('builds search clear message', () => {
    expect(buildSearchClearMessage()).toEqual({
      type: IITC_IRIS_MESSAGES.searchClear,
    });
  });

  it('builds search preview message', () => {
    expect(buildSearchPreviewMessage(portalResult)).toEqual({
      type: IITC_IRIS_MESSAGES.searchPreview,
      searchResult: portalResult,
    });
    expect(buildSearchPreviewMessage(null)).toEqual({
      type: IITC_IRIS_MESSAGES.searchPreview,
      searchResult: undefined,
    });
  });

  it('builds search select message', () => {
    expect(buildSearchSelectMessage(portalResult, true)).toEqual({
      type: IITC_IRIS_MESSAGES.searchSelect,
      searchResult: portalResult,
      searchZoom: true,
    });
  });

  it('calculates next search result index with wrap-around', () => {
    const results: IitcIrisSearchResult[] = [
      portalResult,
      {id: 'p2', type: 'address', title: 'Location', lat: 52.4, lng: 5.0},
    ];
    expect(calculateNextSearchResultIndex(0, 1, results)).toBe(1);
    expect(calculateNextSearchResultIndex(1, 1, results)).toBe(0);
    expect(calculateNextSearchResultIndex(0, -1, results)).toBe(1);
  });

  it('gets active search result excluding empty results', () => {
    const results: IitcIrisSearchResult[] = [
      {id: 'e1', type: 'empty', title: 'No match', description: 'None'},
      portalResult,
    ];
    expect(getActiveSearchResult(results, 0)).toEqual(portalResult);
  });
});
