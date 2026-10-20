import {useCallback, useEffect, useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisMessage, IitcIrisSearchResult, IitcIrisSearchState} from '../../messages';
import type {IitcIrisSheetId} from '../../shell/menu-registry';
import {buildSearchClearMessage, getActiveSearchResult, getSearchDebounceAction} from './actions';
import {
  clearSearchCommand,
  handleSearchKeyDownCommand,
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
  activeSearchResult: IitcIrisSearchResult | undefined;
  setSearchTerm: Dispatch<StateUpdater<string>>;
  setSearchState: Dispatch<StateUpdater<IitcIrisSearchState>>;
  setActiveSearchResultIndex: Dispatch<StateUpdater<number>>;
  requestSearch: (term: string, confirmed?: boolean) => void;
  clearSearch: () => void;
  previewSearchResult: (result: IitcIrisSearchResult | null) => void;
  selectSearchResult: (result: IitcIrisSearchResult, zoom?: boolean) => void;
  handleSearchKeyDown: (event: {key: string; shiftKey: boolean; preventDefault(): void}) => void;
}

export function useSearchWorkflow({mapFocusMode, postMessage, openSheet, closeSheets}: SearchWorkflowParams): SearchWorkflow {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<IitcIrisSearchState>(EMPTY_SEARCH_STATE);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);

  const requestSearch = useCallback((term: string, confirmed = false): void => {
    requestSearchCommand(postMessage, term, confirmed);
  }, [postMessage]);

  const clearSearch = (): void => {
    clearSearchCommand(postMessage, setSearchTerm, setSearchState, setActiveSearchResultIndex, EMPTY_SEARCH_STATE);
  };

  const previewSearchResult = useCallback((result: IitcIrisSearchResult | null): void => {
    previewSearchResultCommand(postMessage, result);
  }, [postMessage]);

  const selectSearchResult = (result: IitcIrisSearchResult, zoom = false): void => {
    selectSearchResultCommand(result, zoom, postMessage, mapFocusMode, closeSheets, openSheet);
  };

  const handleSearchKeyDown = (event: {key: string; shiftKey: boolean; preventDefault(): void}): void => {
    handleSearchKeyDownCommand(event, searchState.results, activeSearchResultIndex, postMessage, mapFocusMode,
      closeSheets, openSheet, setActiveSearchResultIndex);
  };

  return {
    searchTerm, searchState, activeSearchResultIndex,
    activeSearchResult: getActiveSearchResult(searchState.results, activeSearchResultIndex),
    setSearchTerm, setSearchState, setActiveSearchResultIndex,
    requestSearch, clearSearch, previewSearchResult, selectSearchResult, handleSearchKeyDown,
  };
}

// Register these effects where Search previously ran, preserving app message order.
export function useSearchEffects(
  workflow: ReturnType<typeof useSearchWorkflow>,
  activeSheet: IitcIrisSheetId,
  postMessage: SearchWorkflowParams['postMessage'],
): void {
  const {searchTerm, searchState, activeSearchResultIndex, setSearchState, setActiveSearchResultIndex,
    requestSearch, previewSearchResult} = workflow;

  useEffect(() => {
    const action = getSearchDebounceAction(searchTerm);
    if (action.type === 'clear') {
      setSearchState(EMPTY_SEARCH_STATE);
      setActiveSearchResultIndex(0);
      postMessage(buildSearchClearMessage());
      return;
    }
    const timer = window.setTimeout(() => requestSearch(action.term, false), action.delayMs);
    return (): void => window.clearTimeout(timer);
  }, [searchTerm, requestSearch, postMessage, setSearchState, setActiveSearchResultIndex]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchState.term, searchState.results.length, setActiveSearchResultIndex]);

  useEffect(() => {
    if (activeSheet !== 'search') return;
    previewSearchResult(getActiveSearchResult(searchState.results, activeSearchResultIndex) ?? null);
  }, [activeSheet, activeSearchResultIndex, searchState.results, previewSearchResult]);
}
