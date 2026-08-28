import {h} from 'preact';
import {getCommTeamClass} from './comm-display';
import type {IitcIrisSearchResult, IitcIrisSearchState} from './messages';
import {formatElapsedSeconds, getPanelStatusClass} from './ui-status';

interface RenderedSearchResult {
  result: IitcIrisSearchResult;
  selectableIndex: number;
}

export interface IitcIrisSearchPanelProps {
  activeSearchResultIndex: number;
  clearSearch: () => void;
  closeSearch: () => void;
  handleSearchKeyDown: (event: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => void;
  previewSearchResult: (result: IitcIrisSearchResult | null) => void;
  requestSearch: (term: string, confirmed?: boolean) => void;
  searchState: IitcIrisSearchState;
  searchTerm: string;
  selectSearchResult: (result: IitcIrisSearchResult, zoom?: boolean) => void;
  setActiveSearchResultIndex: (index: number) => void;
  setSearchTerm: (term: string) => void;
}

function getGroupedSearchResults(results: IitcIrisSearchResult[]): {id: string; label: string; items: RenderedSearchResult[]}[] {
  let searchSelectableIndex = -1;
  const renderedSearchResults = results.map((result) => ({
    result,
    selectableIndex: result.type === 'empty' ? -1 : ++searchSelectableIndex,
  }));
  return [
    {id: 'portals', label: 'Loaded portals', items: renderedSearchResults.filter(({result}) => result.type === 'portal' || result.type === 'guid')},
    {id: 'addresses', label: 'Addresses', items: renderedSearchResults.filter(({result}) => result.type === 'address')},
    {id: 'coordinates', label: 'Coordinates', items: renderedSearchResults.filter(({result}) => result.type === 'coordinate')},
    {id: 'notices', label: 'Notices', items: renderedSearchResults.filter(({result}) => result.type === 'empty')},
  ].filter((group) => group.items.length > 0);
}

export function IitcIrisSearchPanel(props: IitcIrisSearchPanelProps): h.JSX.Element {
  const groupedSearchResults = getGroupedSearchResults(props.searchState.results);
  const trimmedSearchTerm = props.searchTerm.trim();

  return <aside className="iitc-iris-request-side-panel iitc-iris-search-panel" role="search" aria-label="Search">
    <div className="iitc-iris-request-panel-header">
      <span className="iitc-iris-selected-title">Search</span>
      <span className="iitc-iris-panel-header-actions">
        <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(props.searchState.status)}`}>{props.searchState.status}</span>
        <button className="iitc-iris-clear-selection" type="button" onClick={props.closeSearch} title="Close search" aria-label="Close search">X</button>
      </span>
    </div>
    <div className="iitc-iris-request-panel-body">
      <form
        className="iitc-iris-search-box"
        onSubmit={(event) => {
          event.preventDefault();
          props.requestSearch(props.searchTerm, true);
        }}
      >
        <input
          className="iitc-iris-search-input"
          type="search"
          value={props.searchTerm}
          placeholder="Search portal or address"
          title="Type to search loaded portals. Press Enter to search OpenStreetMap."
          onInput={(event) => props.setSearchTerm(event.currentTarget.value)}
          onKeyDown={props.handleSearchKeyDown}
        />
        {props.searchTerm && (
          <button className="iitc-iris-search-clear" type="button" onClick={props.clearSearch} title="Clear search" aria-label="Clear search">x</button>
        )}
      </form>
      {trimmedSearchTerm.length > 0 && (
        <div className="iitc-iris-search-results">
          <div className="iitc-iris-search-status">
            <span>{props.searchState.status === 'loading' ? 'searching online' : props.searchState.results.length > 0 ? `${props.searchState.results.length} results` : trimmedSearchTerm.length < 3 ? 'type 3+ chars' : 'no local results'}</span>
            {!props.searchState.confirmed && trimmedSearchTerm.length >= 3 && <span>Enter for address</span>}
          </div>
          {groupedSearchResults.map((group) => (
            <div className="iitc-iris-search-result-group" key={group.id}>
              <span className="iitc-iris-search-result-heading">
                {group.label}
                <b>{group.items.length}</b>
              </span>
              {group.items.map(({result, selectableIndex}) => {
                const selectable = result.type !== 'empty';
                const active = selectableIndex === props.activeSearchResultIndex;
                const preview = (): void => {
                  if (selectableIndex >= 0) props.setActiveSearchResultIndex(selectableIndex);
                  props.previewSearchResult(result);
                };
                return (
                  <div
                    className={`iitc-iris-search-result-row iitc-iris-search-result-${result.type} ${active ? 'is-active' : ''}`}
                    key={result.id}
                    onMouseEnter={preview}
                    onMouseLeave={() => props.previewSearchResult(null)}
                  >
                    <button
                      className="iitc-iris-search-result"
                      type="button"
                      onClick={() => props.selectSearchResult(result)}
                      disabled={!selectable}
                      onFocus={preview}
                      onBlur={() => props.previewSearchResult(null)}
                      title={result.title}
                    >
                      <span className="iitc-iris-search-result-main">
                        <span className="iitc-iris-search-result-type">{result.type === 'coordinate' ? 'coords' : result.type}</span>
                        <span className={result.team ? getCommTeamClass(result.team) : ''}>{result.title}</span>
                      </span>
                      {result.description && <small>{result.description}</small>}
                    </button>
                    {selectable && (
                      <button
                        className="iitc-iris-search-result-zoom"
                        type="button"
                        onClick={() => props.selectSearchResult(result, true)}
                        onFocus={preview}
                        onBlur={() => props.previewSearchResult(null)}
                        title={`Zoom to ${result.title}`}
                      >
                        Zoom
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {props.searchState.error && <span className="iitc-iris-warning">{props.searchState.error}</span>}
        </div>
      )}
      <div className="iitc-iris-panel-footer">
        <span
          className="iitc-iris-diagnostics-chip"
          title={[
            props.searchState.confirmed ? 'request: Nominatim search' : 'request: local portal search only',
            `local: ${props.searchState.localResults}`,
            `online: ${props.searchState.onlineResults ?? '-'}`,
          ].join('\n')}
        >
          {props.searchState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(props.searchState.elapsedMs)}s` : 'request'}
        </span>
        {props.searchState.results.length > 0 && (
          <button className="iitc-iris-diagnostics-chip iitc-iris-chip-button" type="button" onClick={props.clearSearch} title="Clear search results and map overlay">
            clear overlay
          </button>
        )}
      </div>
    </div>
  </aside>;
}
