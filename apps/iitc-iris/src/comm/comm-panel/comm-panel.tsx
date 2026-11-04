import {h, type RefObject} from 'preact';
import './comm.css';
import {formatCommBounds} from '../comm-display';
import {IitcIrisCommMessageList} from './comm-message-list';
import {IitcIrisCommPanelBody} from './comm-panel-body';
import {IitcIrisCommPanelControls} from './comm-panel-controls';
import type {IitcIrisCommState, IitcIrisCommTab} from '../../messages';
import {formatElapsedSeconds, getAuthErrorMessage} from '../../ui-status';
import {DiagnosticsChip} from '../../ui/diagnostics-chip';
import {PanelBody, PanelFooter} from '../../ui/panel';
import {StatusText} from '../../ui/status-text';
import {EmptyState} from '../../ui/empty-state';
import {matchesIitcCommFilters} from '@iris/iitc-core';
import {CommFilters, useCommFilters} from './comm-filters';

export interface IitcIrisCommPanelProps {
  commDraft: string;
  commListRef: RefObject<HTMLDivElement>;
  commNewBelow: boolean;
  commState: IitcIrisCommState;
  commUserAtBottom: boolean;
  addNickname: (nickname: string) => void;
  jumpToLatest: () => void;
  onDraftChange: (value: string) => void;
  onScroll: () => void;
  refresh: () => void;
  requestOlder: () => void;
  selectPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void;
  selectTab: (tab: IitcIrisCommTab) => void;
  send: () => void;
  ownNickname?: string;
}

export function IitcIrisCommPanel(props: IitcIrisCommPanelProps): h.JSX.Element {
  const {commState} = props;
  const views = useCommFilters();
  const visible = (commState.recent ?? []).filter(message => matchesIitcCommFilters(message, views.filters));
  const visibleState = {...commState, recent: visible};
  return <PanelBody>
    <IitcIrisCommPanelControls
      commNewBelow={props.commNewBelow}
      commState={commState}
      commUserAtBottom={props.commUserAtBottom}
      jumpToLatest={props.jumpToLatest}
      refresh={props.refresh}
      requestOlder={props.requestOlder}
      selectTab={props.selectTab}
    />
    <CommFilters {...views} shown={visible.length} total={commState.recent?.length ?? 0} />
    {commState.status === 'auth' && (
      <EmptyState>COMM requires an authenticated Intel session.</EmptyState>
    )}
    {(commState.status === 'empty' || (!commState.recent?.length && commState.status !== 'loading' && commState.status !== 'idle' && commState.status !== 'auth')) && (
      <EmptyState>No COMM messages for this channel and map bounds.</EmptyState>
    )}
    {!visible.length && Boolean(commState.recent?.length) && <EmptyState>No loaded messages match these filters.</EmptyState>}
    <IitcIrisCommMessageList addNickname={props.addNickname} commListRef={props.commListRef} commState={visibleState} onScroll={props.onScroll} selectPortal={props.selectPortal} ownNickname={props.ownNickname} />
    <IitcIrisCommPanelBody commDraft={props.commDraft} commState={commState} onDraftChange={props.onDraftChange} send={props.send}
      nicknames={[...new Set(visible.flatMap(message => [message.player ?? '', ...message.players]).filter(Boolean))]} />
    {(commState.sendStatus === 'sent' || commState.sendError) && (
      <StatusText className={commState.sendError ? 'iitc-iris-warning' : ''} title={commState.sendError}>
        {commState.sendError ? `Send failed: ${getAuthErrorMessage(commState.sendStatus, commState.sendError)} Your text is kept in this channel; check COMM before retrying.` : 'Message sent.'}
      </StatusText>
    )}
    <PanelFooter>
      <DiagnosticsChip
        title={[
          `request: /r/getPlexts ${commState.tab}`,
          `bounds: ${formatCommBounds(commState.bounds)}`,
          `response: ${commState.responseMessages ?? '-'}`,
          `older: ${commState.requestOlder ? (commState.oldMessagesWereAdded ? 'added' : 'none') : '-'}`,
        ].join('\n')}
      >
        {commState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(commState.elapsedMs)}s` : 'request'}
      </DiagnosticsChip>
      {commState.error && (
        <StatusText className="iitc-iris-warning" title={commState.error}>
          {commState.status === 'auth' ? 'COMM requires an authenticated Intel session.' : getAuthErrorMessage(commState.status, commState.error)}
        </StatusText>
      )}
    </PanelFooter>
  </PanelBody>;
}
