import {h} from 'preact';
import type {IitcIrisCommState, IitcIrisCommTab} from './messages';
import {formatCommTime} from './comm-display';

export const IITC_IRIS_COMM_TABS: {id: IitcIrisCommTab; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'faction', label: 'Faction'},
  {id: 'alerts', label: 'Alerts'},
];

export interface IitcIrisCommPanelControlsProps {
  commNewBelow: boolean;
  commState: IitcIrisCommState;
  commUserAtBottom: boolean;
  jumpToLatest: () => void;
  refresh: () => void;
  requestOlder: () => void;
  selectTab: (tab: IitcIrisCommTab) => void;
}

function formatInteger(value: number | undefined): string {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

export function IitcIrisCommPanelControls(props: IitcIrisCommPanelControlsProps): h.JSX.Element {
  const {commNewBelow, commState, commUserAtBottom} = props;
  return <>
    <div className="iitc-iris-segmented-row" role="tablist" aria-label="COMM channel">
      {IITC_IRIS_COMM_TABS.map((tab) => (
        <button className={`iitc-iris-segmented-button ${commState.tab === tab.id ? 'is-active' : ''}`} type="button" role="tab" aria-selected={commState.tab === tab.id} onClick={() => props.selectTab(tab.id)} disabled={commState.status === 'loading' && commState.tab === tab.id} key={tab.id}>
          {tab.label}
        </button>
      ))}
    </div>
    <div className="iitc-iris-map-control-row">
      <button className="iitc-iris-portal-action" type="button" onClick={props.refresh} disabled={commState.status === 'loading'} title="Fetch COMM messages for the current map bounds">{commState.status === 'loading' ? 'Loading' : 'Refresh'}</button>
      <button className="iitc-iris-portal-action" type="button" onClick={props.requestOlder} disabled={commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0} title="Fetch older COMM messages before the current oldest timestamp">Older</button>
      {(!commUserAtBottom || commNewBelow) && <button className="iitc-iris-portal-action" type="button" onClick={props.jumpToLatest} title="Jump to latest COMM message">{commNewBelow ? 'New' : 'Latest'}</button>}
    </div>
    <div className="iitc-iris-panel-summary">
      <span><b>{formatInteger(commState.messages)}</b><small>messages</small></span>
      <span><b>{formatInteger(commState.addedMessages)}</b><small>added</small></span>
      <span><b>{commState.oldestTimestamp !== undefined && commState.newestTimestamp !== undefined ? `${formatCommTime(commState.oldestTimestamp)} - ${formatCommTime(commState.newestTimestamp)}` : '-'}</b><small>range</small></span>
    </div>
  </>;
}
