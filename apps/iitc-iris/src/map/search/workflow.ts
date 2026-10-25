import {useCallback, useEffect, useRef, useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisMessage, IitcIrisSearchResult, IitcIrisSearchState} from '../../messages';
import type {IitcIrisSheetId} from '../../shell/menu-registry';
import {buildSearchClearMessage, getActiveSearchResult, getSearchDebounceAction} from './actions';
import {
  clearSearchCommand,
  previewSearchResultCommand,
  requestSearchCommand,
  selectSearchResultCommand,
} from './commands';

const EMPTY_SEARCH_STATE: IitcIrisSearchState = {
  status: 'idle', term: '', confirmed: false, results: [], localResults: 0,
};

interface SearchWorkflowParams {
  mapFocusMode: boolean;
  postMessage: (message: IitcIrisMessage) => void;
  openSheet: (sheet: IitcIrisSheetId) => void;
  closeSheets: () => void;
}

interface SearchWorkflow {
  searchTerm: string;
  searchState: IitcIrisSearchState;
  activeSearchResultIndex: number;
  setSearchTerm: (term: string) => void;
  setSearchState: Dispatch<StateUpdater<IitcIrisSearchState>>;
  setActiveSearchResultIndex: Dispatch<StateUpdater<number>>;
  requestSearch: (term: string, confirmed?: boolean) => void;
  syncSearchTerm: () => (() => void) | undefined;
  clearSearch: () => void;
  previewSearchResult: (result: IitcIrisSearchResult | null) => void;
  selectSearchResult: (result: IitcIrisSearchResult) => void;
}

export function useSearchWorkflow({mapFocusMode, postMessage, openSheet, closeSheets}: SearchWorkflowParams): SearchWorkflow {
  const [searchTerm, updateSearchTerm] = useState('');
  const pendingSearch = useRef<{term: string; confirmed: boolean; timer?: number}>({term: '', confirmed: false});
  const [searchState, setSearchState] = useState<IitcIrisSearchState>(EMPTY_SEARCH_STATE);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);

  const setSearchTerm = useCallback((term: string): void => {
    const pending = pendingSearch.current;
    if (pending.term === term) return;
    window.clearTimeout(pending.timer);
    pending.term = term;
    pending.confirmed = false;
    updateSearchTerm(term);
  }, []);

  const requestSearch = useCallback((term: string, confirmed = false): void => {
    if (confirmed) {
      // Match IITC: submitting takes priority over the pending local debounce.
      window.clearTimeout(pendingSearch.current.timer);
      pendingSearch.current.confirmed = true;
    }
    requestSearchCommand(postMessage, term, confirmed);
  }, [postMessage]);

  // Registered by useSearchEffects to retain the app's effect/message ordering.
  const syncSearchTerm = useCallback((): (() => void) | undefined => {
    const pending = pendingSearch.current;
    // A submit or edit may precede this deferred effect. Do not schedule stale work.
    if (pending.term !== searchTerm || pending.confirmed) return;
    const action = getSearchDebounceAction(searchTerm);
    if (action.type === 'clear') {
      setSearchState(EMPTY_SEARCH_STATE);
      setActiveSearchResultIndex(0);
      postMessage(buildSearchClearMessage());
      return;
    }
    const timer = window.setTimeout(() => {
      if (pending.term === searchTerm && !pending.confirmed) requestSearch(action.term, false);
    }, action.delayMs);
    pending.timer = timer;
    return (): void => window.clearTimeout(timer);
  }, [searchTerm, requestSearch, postMessage]);

  const clearSearch = (): void => {
    clearSearchCommand(postMessage, setSearchTerm, setSearchState, setActiveSearchResultIndex, EMPTY_SEARCH_STATE);
  };

  const previewSearchResult = useCallback((result: IitcIrisSearchResult | null): void => {
    previewSearchResultCommand(postMessage, result);
  }, [postMessage]);

  const selectSearchResult = (result: IitcIrisSearchResult): void => {
    selectSearchResultCommand(result, postMessage, mapFocusMode, closeSheets, openSheet);
  };

  return {
    searchTerm, searchState, activeSearchResultIndex,
    setSearchTerm, setSearchState, setActiveSearchResultIndex,
    requestSearch, syncSearchTerm, clearSearch, previewSearchResult, selectSearchResult,
  };
}

// Register these effects where Search previously ran, preserving app message order.
export function useSearchEffects(
  workflow: ReturnType<typeof useSearchWorkflow>,
  activeSheet: IitcIrisSheetId,
): void {
  const {searchState, activeSearchResultIndex, setActiveSearchResultIndex, syncSearchTerm, previewSearchResult} = workflow;

  useEffect(syncSearchTerm, [syncSearchTerm]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchState.term, searchState.results.length, setActiveSearchResultIndex]);

  useEffect(() => {
    if (activeSheet !== 'search') return;
    previewSearchResult(getActiveSearchResult(searchState.results, activeSearchResultIndex) ?? null);
    return (): void => previewSearchResult(null);
  }, [activeSheet, activeSearchResultIndex, searchState.results, previewSearchResult]);
}
