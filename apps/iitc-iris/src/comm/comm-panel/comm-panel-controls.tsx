import {h} from 'preact';
import './comm.css';
import type {IitcIrisCommState, IitcIrisCommTab} from '../../messages';
import {formatCommTime} from '../comm-display';
import {SegmentedRow, SegmentedButton} from '../../ui/segmented-control';
import {ControlRow} from '../../ui/control-row';
import {ActionButton} from '../../ui/action-button';

import {IITC_IRIS_COMM_TABS} from '../tabs';

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
    <SegmentedRow role="tablist" aria-label="COMM channel">
      {IITC_IRIS_COMM_TABS.map((tab) => (
        <SegmentedButton active={commState.tab === tab.id} role="tab" aria-selected={commState.tab === tab.id} onClick={() => props.selectTab(tab.id)} disabled={commState.status === 'loading' && commState.tab === tab.id} key={tab.id}>
          {tab.label}
        </SegmentedButton>
      ))}
    </SegmentedRow>
    <ControlRow>
      <ActionButton onClick={() => props.refresh()} disabled={commState.status === 'loading'} title="Fetch COMM messages for the current map bounds">{commState.status === 'loading' ? 'Loading' : 'Refresh'}</ActionButton>
      <ActionButton onClick={() => props.requestOlder()} disabled={commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0} title="Fetch older COMM messages before the current oldest timestamp">Older</ActionButton>
      {(!commUserAtBottom || commNewBelow) && <ActionButton onClick={props.jumpToLatest} title="Jump to latest COMM message">{commNewBelow ? 'New' : 'Latest'}</ActionButton>}
    </ControlRow>
  </>;
}

export function IitcIrisCommLoadedSummary({commState, shown}: {commState: IitcIrisCommState; shown: number}): h.JSX.Element {
  return <div className="iitc-iris-comm-summary" aria-label="COMM summary">
    <div><b>{formatInteger(commState.messages)}</b> loaded messages
      {shown !== (commState.recent?.length ?? 0) && <> · <b>{formatInteger(shown)}</b> shown</>}
      {Boolean(commState.addedMessages) && <> · <b>{formatInteger(commState.addedMessages)}</b> added</>}
    </div>
    {commState.oldestTimestamp !== undefined && commState.oldestTimestamp >= 0 && commState.newestTimestamp !== undefined && commState.newestTimestamp >= 0 &&
      <small>{formatCommTime(commState.oldestTimestamp)} – {formatCommTime(commState.newestTimestamp)}</small>}
  </div>;
}
