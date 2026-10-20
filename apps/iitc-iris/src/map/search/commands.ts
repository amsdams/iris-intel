import type {IitcIrisMessage, IitcIrisSearchResult, IitcIrisSearchState} from '../../messages';
import type {IitcIrisSheetId} from '../../shell/menu-registry';
import {
  buildSearchClearMessage,
  buildSearchPreviewMessage,
  buildSearchRequestMessage,
  buildSearchSelectMessage,
  calculateNextSearchResultIndex,
  getActiveSearchResult,
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
  zoom: boolean,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
): void {
  if (result.type === 'empty') return;
  postMessage(buildSearchSelectMessage(result, zoom));
  if (mapFocusMode) {
    closeSheets();
  } else if (result.type === 'portal' || result.type === 'guid') {
    openSheet('portal');
  }
}

/**
 * Move the active search result index by `delta`, skipping `empty` rows and
 * wrapping around.
 */
export function moveSearchSelectionCommand(
  delta: number,
  results: IitcIrisSearchResult[],
  setIndex: (updater: (current: number) => number) => void,
): void {
  setIndex((current) => calculateNextSearchResultIndex(current, delta, results));
}

/**
 * Select the currently active (non-empty) search result.
 *
 * Returns `false` when there is no active result (caller may skip
 * `preventDefault`).
 */
export function selectActiveSearchResultCommand(
  results: IitcIrisSearchResult[],
  activeIndex: number,
  zoom: boolean,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
): boolean {
  const result = getActiveSearchResult(results, activeIndex);
  if (!result) return false;
  selectSearchResultCommand(result, zoom, postMessage, mapFocusMode, closeSheets, openSheet);
  return true;
}

/**
 * Handle keyboard navigation in the search input.
 *
 * - ArrowDown / ArrowUp: move selection and call `preventDefault`.
 * - Enter: select active result (with zoom when Shift is held) and call
 *   `preventDefault` only when a result was selected.
 * - All other keys are ignored.
 *
 * NOTE: ArrowDown/ArrowUp pass `setIndex` from the caller so the actual
 * state update happens in the Search workflow; the index used for movement is the
 * current snapshot already captured at call time.
 */
export function handleSearchKeyDownCommand(
  event: {key: string; shiftKey: boolean; preventDefault(): void},
  results: IitcIrisSearchResult[],
  activeIndex: number,
  postMessage: PostMessageFn,
  mapFocusMode: boolean,
  closeSheets: () => void,
  openSheet: (sheet: IitcIrisSheetId) => void,
  setIndex: (updater: (current: number) => number) => void,
): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSearchSelectionCommand(1, results, setIndex);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSearchSelectionCommand(-1, results, setIndex);
    return;
  }
  if (event.key === 'Enter') {
    const selected = selectActiveSearchResultCommand(
      results, activeIndex, event.shiftKey, postMessage, mapFocusMode, closeSheets, openSheet,
    );
    if (selected) event.preventDefault();
  }
}
