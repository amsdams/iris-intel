import {h, type TargetedKeyboardEvent} from 'preact';
import {useRef} from 'preact/hooks';
import './search.css';
import '../../ui/shared/input-surface.css';
import '../../ui/shared/list-item.css';
import {getCommTeamClass} from '../../comm/comm-display';
import type {IitcIrisSearchResult, IitcIrisSearchState} from '../../messages';
import {Panel, PanelHeader, PanelTitle, PanelBody, PanelFooter} from '../../ui/panel';
import {formatElapsedSeconds, getPanelStatusClass} from '../../ui-status';
import {TextInput} from '../../ui/text-input';
import {ClearButton} from '../../ui/clear-button';
import {DiagnosticsChip} from '../../ui/diagnostics-chip';
import {ChipButton} from '../../ui/chip-button';
import {StatusText} from '../../ui/status-text';

interface RenderedSearchResult {
  result: IitcIrisSearchResult;
  selectableIndex: number;
}

export interface IitcIrisSearchPanelProps {
  activeSearchResultIndex: number;
  clearSearch: () => void;
  closeSearch: () => void;
  previewSearchResult: (result: IitcIrisSearchResult | null) => void;
  requestSearch: (term: string, confirmed?: boolean) => void;
  searchState: IitcIrisSearchState;
  searchTerm: string;
  selectSearchResult: (result: IitcIrisSearchResult) => void;
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
  const resultsRef = useRef<HTMLDivElement>(null);
  const groupedSearchResults = getGroupedSearchResults(props.searchState.results);
  const trimmedSearchTerm = props.searchTerm.trim();

  // Move actual focus, so Enter in the field submits and Enter on a row opens it.
  const handleResultNavigation = (event: TargetedKeyboardEvent<HTMLInputElement | HTMLButtonElement>): void => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(resultsRef.current?.querySelectorAll<HTMLButtonElement>('.iitc-iris-search-result:not(:disabled)') ?? []);
    if (buttons.length === 0) return;
    const current = buttons.indexOf(event.currentTarget as HTMLButtonElement);
    const next = current < 0
      ? event.key === 'ArrowDown' ? 0 : buttons.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    event.stopPropagation();
    buttons[next].focus();
  };

  return <Panel className="iitc-iris-search-panel" role="search" aria-label="Search">
    <PanelHeader>
      <PanelTitle>Search</PanelTitle>
      <span className="iitc-iris-panel-header-actions">
        <StatusText className={`iitc-iris-panel-state ${getPanelStatusClass(props.searchState.status)}`}>{props.searchState.status}</StatusText>
        <ClearButton onClick={props.closeSearch} title="Close search" aria-label="Close search" />
      </span>
    </PanelHeader>
    <PanelBody>
      <form
        className="iitc-iris-input-surface iitc-iris-search-box"
        onSubmit={(event) => {
          event.preventDefault();
          props.requestSearch(props.searchTerm, true);
        }}
      >
        <TextInput
          className="iitc-iris-search-input"
          type="search"
          value={props.searchTerm}
          placeholder="Search portal or address"
          title="Type to search loaded portals. Press Enter to search OpenStreetMap."
          onInput={(event) => props.setSearchTerm(event.currentTarget.value)}
          onKeyDown={handleResultNavigation}
        />
        {props.searchTerm && (
          <button className="iitc-iris-search-clear" type="button" onClick={props.clearSearch} title="Clear search" aria-label="Clear search">x</button>
        )}
      </form>
      {trimmedSearchTerm.length > 0 && (
        <div className="iitc-iris-search-results" ref={resultsRef}>
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
                    className={`iitc-iris-list-item iitc-iris-search-result-row iitc-iris-search-result-${result.type} ${active ? 'is-active' : ''}`}
                    key={result.id}
                    onMouseEnter={preview}
                    onMouseLeave={() => props.previewSearchResult(null)}
                  >
                    <button
                      className="iitc-iris-search-result"
                      type="button"
                      onClick={() => props.selectSearchResult(result)}
                      disabled={!selectable}
                      onKeyDown={handleResultNavigation}
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
                  </div>
                );
              })}
            </div>
          ))}
          {props.searchState.error && <StatusText className="iitc-iris-warning">{props.searchState.error}</StatusText>}
        </div>
      )}
      <PanelFooter>
        <DiagnosticsChip
          title={[
            props.searchState.confirmed ? 'request: Nominatim search' : 'request: local portal search only',
            `local: ${props.searchState.localResults}`,
            `online: ${props.searchState.onlineResults ?? '-'}`,
          ].join('\n')}
        >
          {props.searchState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(props.searchState.elapsedMs)}s` : 'request'}
        </DiagnosticsChip>
        {props.searchState.results.length > 0 && (
          <ChipButton onClick={props.clearSearch} title="Clear search results and map overlay">
            clear overlay
          </ChipButton>
        )}
      </PanelFooter>
    </PanelBody>
  </Panel>;
}
