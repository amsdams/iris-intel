import {h, type RefObject} from 'preact';
import {formatCommBounds} from './comm-display';
import {IitcIrisCommMessageList} from './comm-message-list';
import {IitcIrisCommPanelBody} from './comm-panel-body';
import {IitcIrisCommPanelControls} from './comm-panel-controls';
import type {IitcIrisCommState, IitcIrisCommTab} from '../messages';
import {formatElapsedSeconds, getAuthErrorMessage} from '../ui-status';
import {PlainDiagnosticsChip} from '../ui/diagnostics-chip';
import {PanelBody, PanelFooter} from '../ui/panel';
import {StatusText} from '../ui/status-text';
import {EmptyState} from '../ui/empty-state';

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
}

export function IitcIrisCommPanel(props: IitcIrisCommPanelProps): h.JSX.Element {
  const {commState} = props;
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
    {commState.status === 'auth' && (
      <EmptyState>COMM requires an authenticated Intel session.</EmptyState>
    )}
    {(commState.status === 'empty' || (!commState.recent?.length && commState.status !== 'loading' && commState.status !== 'idle' && commState.status !== 'auth')) && (
      <EmptyState>No COMM messages for this channel and map bounds.</EmptyState>
    )}
    <IitcIrisCommMessageList addNickname={props.addNickname} commListRef={props.commListRef} commState={commState} onScroll={props.onScroll} selectPortal={props.selectPortal} />
    <IitcIrisCommPanelBody commDraft={props.commDraft} commState={commState} onDraftChange={props.onDraftChange} send={props.send} />
    {(commState.sendStatus === 'sent' || commState.sendError) && (
      <StatusText className={commState.sendError ? 'iitc-iris-warning' : ''} title={commState.sendError}>
        send {commState.sendError ? getAuthErrorMessage(commState.sendStatus, commState.sendError) : commState.sendStatus}
      </StatusText>
    )}
    <PanelFooter>
      <PlainDiagnosticsChip
        title={[
          `request: /r/getPlexts ${commState.tab}`,
          `bounds: ${formatCommBounds(commState.bounds)}`,
          `response: ${commState.responseMessages ?? '-'}`,
          `older: ${commState.requestOlder ? (commState.oldMessagesWereAdded ? 'added' : 'none') : '-'}`,
        ].join('\n')}
      >
        {commState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(commState.elapsedMs)}s` : 'request'}
      </PlainDiagnosticsChip>
      {commState.error && (
        <StatusText className="iitc-iris-warning" title={commState.error}>
          {commState.status === 'auth' ? 'COMM requires an authenticated Intel session.' : getAuthErrorMessage(commState.status, commState.error)}
        </StatusText>
      )}
    </PanelFooter>
  </PanelBody>;
}
