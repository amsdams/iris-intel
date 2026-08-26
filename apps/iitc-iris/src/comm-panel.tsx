import {h, type RefObject} from 'preact';
import {formatCommBounds} from './comm-display';
import {IitcIrisCommMessageList} from './comm-message-list';
import {IitcIrisCommPanelBody} from './comm-panel-body';
import {IitcIrisCommPanelControls} from './comm-panel-controls';
import type {IitcIrisCommState, IitcIrisCommTab} from './messages';
import {formatElapsedSeconds, getAuthErrorMessage} from './ui-status';

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
  return <div className="iitc-iris-request-panel-body">
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
      <div className="iitc-iris-empty-state">COMM requires an authenticated Intel session.</div>
    )}
    {(commState.status === 'empty' || (!commState.recent?.length && commState.status !== 'loading' && commState.status !== 'idle' && commState.status !== 'auth')) && (
      <div className="iitc-iris-empty-state">No COMM messages for this channel and map bounds.</div>
    )}
    <IitcIrisCommMessageList addNickname={props.addNickname} commListRef={props.commListRef} commState={commState} onScroll={props.onScroll} selectPortal={props.selectPortal} />
    <IitcIrisCommPanelBody commDraft={props.commDraft} commState={commState} onDraftChange={props.onDraftChange} send={props.send} />
    {(commState.sendStatus === 'sent' || commState.sendError) && (
      <span className={`iitc-iris-status ${commState.sendError ? 'iitc-iris-warning' : ''}`} title={commState.sendError}>
        send {commState.sendError ? getAuthErrorMessage(commState.sendStatus, commState.sendError) : commState.sendStatus}
      </span>
    )}
    <div className="iitc-iris-panel-footer">
      <span
        className="iitc-iris-diagnostics-chip"
        title={[
          `request: /r/getPlexts ${commState.tab}`,
          `bounds: ${formatCommBounds(commState.bounds)}`,
          `response: ${commState.responseMessages ?? '-'}`,
          `older: ${commState.requestOlder ? (commState.oldMessagesWereAdded ? 'added' : 'none') : '-'}`,
        ].join('\n')}
      >
        {commState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(commState.elapsedMs)}s` : 'request'}
      </span>
      {commState.error && (
        <span className="iitc-iris-warning" title={commState.error}>
          {commState.status === 'auth' ? 'COMM requires an authenticated Intel session.' : getAuthErrorMessage(commState.status, commState.error)}
        </span>
      )}
    </div>
  </div>;
}
