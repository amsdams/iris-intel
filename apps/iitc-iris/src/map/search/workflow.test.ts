import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisSearchResult} from '../../messages';
import type {IitcIrisSheetId} from '../../shell/menu-registry';
import {useSearchEffects, useSearchWorkflow} from './workflow';

interface HostProps {activeSheet?: IitcIrisSheetId; mapFocusMode?: boolean}

describe('Search workflow lifecycle', () => {
  let root: Element;
  let search: ReturnType<typeof useSearchWorkflow>;
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();
  const openSheet = vi.fn();
  const closeSheets = vi.fn();
  const first: IitcIrisSearchResult = {id: 'one', type: 'portal', title: 'First', guid: 'one', lat: 52, lng: 4};
  const second: IitcIrisSearchResult = {...first, id: 'two', guid: 'two', title: 'Second'};

  function Host({activeSheet = 'map', mapFocusMode = false}: HostProps): null {
    search = useSearchWorkflow({mapFocusMode, postMessage, openSheet, closeSheets});
    useSearchEffects(search, activeSheet);
    return null;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // A null-rendering host exercises real Preact state/effects without DOM markup.
    vi.stubGlobal('document', {});
    vi.stubGlobal('window', {setTimeout, clearTimeout});
    root = {firstChild: null, childNodes: []} as unknown as Element;
  });

  afterEach(async () => {
    await act(() => render(null, root));
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('debounces the latest query, clears empty input, and cancels superseded requests', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.searchClear});
    postMessage.mockClear();
    await act(() => search.setSearchTerm(' first '));
    await act(() => { vi.advanceTimersByTime(99); });
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => search.setSearchTerm(' second '));
    await act(() => { vi.advanceTimersByTime(99); });
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => { vi.advanceTimersByTime(1); });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.searchRequest, searchTerm: 'second', searchConfirmed: false,
    });
    await act(() => search.setSearchTerm('pending'));
    postMessage.mockClear();
    await act(() => search.clearSearch());
    await act(() => { vi.advanceTimersByTime(200); });
    expect(search.searchTerm).toBe('');
    expect(search.searchState.results).toEqual([]);
    expect(postMessage.mock.calls.every(([message]) => message.type === IITC_IRIS_MESSAGES.searchClear)).toBe(true);
  });

  it('cancels a pending request on unmount', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => search.setSearchTerm('pending'));
    postMessage.mockClear();
    await act(() => render(null, root));
    await act(() => { vi.advanceTimersByTime(200); });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('previews the active selectable result only in Search and resets selection for new results', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => search.setSearchState({
      status: 'ready', term: 'first', confirmed: false, localResults: 2,
      results: [{id: 'empty', type: 'empty', title: 'Notice'}, first, second],
    }));
    postMessage.mockClear();
    await act(() => search.setActiveSearchResultIndex(1));
    expect(search.activeSearchResultIndex).toBe(1);
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => render(h<HostProps>(Host, {activeSheet: 'search'}), root));
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.searchPreview, searchResult: second});
    await act(() => search.setSearchState({
      status: 'ready', term: 'next', confirmed: false, localResults: 2, results: [first, second],
    }));
    expect(search.activeSearchResultIndex).toBe(0);
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.searchPreview, searchResult: first});
    postMessage.mockClear();
    await act(() => render(h<HostProps>(Host, {activeSheet: 'map'}), root));
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.searchPreview, searchResult: undefined});
    expect(search.searchState.results).toEqual([first, second]);
    postMessage.mockClear();
    await act(() => search.setActiveSearchResultIndex(1));
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('confirmed submission cancels a pending debounce and editing resumes local search', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => search.setSearchTerm('Amsterdam'));
    await act(() => { vi.advanceTimersByTime(99); });
    postMessage.mockClear();
    await act(() => search.requestSearch('Amsterdam', true));
    await act(() => { vi.advanceTimersByTime(200); });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.searchRequest, searchTerm: 'Amsterdam', searchConfirmed: true,
    });
    postMessage.mockClear();
    await act(() => search.setSearchTerm('Rotterdam'));
    await act(() => { vi.advanceTimersByTime(100); });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.searchRequest, searchTerm: 'Rotterdam', searchConfirmed: false,
    });
  });

  it('does not schedule local work when submitted before the term effect runs', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    postMessage.mockClear();
    await act(() => {
      search.setSearchTerm('Amsterdam');
      search.requestSearch('Amsterdam', true);
    });
    await act(() => { vi.advanceTimersByTime(200); });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.searchRequest, searchTerm: 'Amsterdam', searchConfirmed: true,
    });
  });

  it('uses current navigation mode for result selection and supports explicit confirmed requests', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => search.setSearchState({
      status: 'ready', term: 'test', confirmed: false, localResults: 2, results: [first, second],
    }));
    await act(() => search.selectSearchResult(second));
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.searchSelect, searchResult: second});
    expect(openSheet).toHaveBeenCalledWith('portal');
    openSheet.mockClear();
    await act(() => render(h<HostProps>(Host, {mapFocusMode: true}), root));
    await act(() => search.selectSearchResult(first));
    expect(closeSheets).toHaveBeenCalledOnce();
    expect(openSheet).not.toHaveBeenCalled();
    await act(() => search.requestSearch('retry', true));
    expect(postMessage).toHaveBeenLastCalledWith({
      type: IITC_IRIS_MESSAGES.searchRequest, searchTerm: 'retry', searchConfirmed: true,
    });
  });
});
