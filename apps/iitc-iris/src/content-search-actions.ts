import type {IitcIrisMessage, IitcIrisSearchResult} from './messages';
import {IITC_IRIS_MESSAGES} from './messages';

export function buildSearchRequestMessage(
  searchTerm: string,
  searchConfirmed = false
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.searchRequest,
    searchTerm,
    searchConfirmed,
  };
}

export function buildSearchClearMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.searchClear,
  };
}

export function buildSearchPreviewMessage(
  searchResult: IitcIrisSearchResult | null
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.searchPreview,
    searchResult: searchResult ?? undefined,
  };
}

export function buildSearchSelectMessage(
  searchResult: IitcIrisSearchResult,
  searchZoom = false
): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.searchSelect,
    searchResult,
    searchZoom,
  };
}

export function calculateNextSearchResultIndex(
  currentIndex: number,
  delta: number,
  results: IitcIrisSearchResult[]
): number {
  const selectableResults = results.filter((result) => result.type !== 'empty');
  if (selectableResults.length === 0) return 0;
  return (currentIndex + delta + selectableResults.length) % selectableResults.length;
}

export function getActiveSearchResult(
  results: IitcIrisSearchResult[],
  index: number
): IitcIrisSearchResult | undefined {
  const selectable = results.filter((r) => r.type !== 'empty');
  return selectable[index];
}

export type SearchDebounceAction =
  | {type: 'clear'}
  | {type: 'request'; term: string; delayMs: 100};

/** Returns 'clear' for an empty/whitespace term, or 'request' with the trimmed term and debounce delay. */
export function getSearchDebounceAction(searchTerm: string): SearchDebounceAction {
  const term = searchTerm.trim();
  if (term.length === 0) {
    return {type: 'clear'};
  }
  return {type: 'request', term, delayMs: 100};
}
