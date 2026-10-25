import type {IitcIrisMessage, IitcIrisSearchResult, IitcIrisSearchState} from '../../messages';
import type {IitcIrisSheetId} from '../../shell/menu-registry';
import {
  buildSearchClearMessage,
  buildSearchPreviewMessage,
  buildSearchRequestMessage,
  buildSearchSelectMessage,
} from './actions';

type PostMessageFn = (message: IitcIrisMessage) => void;

/** Post a search-request message with optional confirmed flag. */
export function requestSearchCommand(
  postMessage: PostMessageFn,
  term: string,
  confirmed = false,
): void {
  postMessage(buildSearchRequestMessage(term, confirmed));
}

/**
 * Clear active search: reset local state setters and post `searchClear`.
 *
 * The empty `IitcIrisSearchState` to restore is passed in so this module
 * does not own the constant.
 */
export function clearSearchCommand(
  postMessage: PostMessageFn,
  setSearchTerm: (term: string) => void,
  setSearchState: (state: IitcIrisSearchState) => void,
  setActiveSearchResultIndex: (index: number) => void,
  emptySearchState: IitcIrisSearchState,
): void {
  setSearchTerm('');
  setSearchState(emptySearchState);
  setActiveSearchResultIndex(0);
  postMessage(buildSearchClearMessage());
}

/** Post a search-preview message for `result` (or clear preview when `null`). */
export function previewSearchResultCommand(
  postMessage: PostMessageFn,
  result: IitcIrisSearchResult | null,
): void {
  postMessage(buildSearchPreviewMessage(result));
}

/**
 * Select a search result.
 *
 * No-ops when `result.type === 'empty'`. Posts a `searchSelect` message, then
 * either closes sheets (map-focus mode) or opens the portal sheet for
 * portal/guid results.
 */
export function selectSearchResultCommand(
  result: IitcIrisSearchResult,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
): void {
  if (result.type === 'empty') return;
  postMessage(buildSearchSelectMessage(result));
  if (mapFocusMode) {
    closeSheets();
  } else if (result.type === 'portal' || result.type === 'guid') {
    openSheet('portal');
  }
}
