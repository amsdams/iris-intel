import type {RefObject} from 'preact';
import {useCallback, useEffect, useRef, useState} from 'preact/hooks';
import {IITC_IRIS_MESSAGES, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisMessage} from '../messages';
import type {IitcIrisSidePanelId} from '../shell/menu-registry';
import {getCommAutoRequest} from '../shell/side-panel-auto-requests';
import {storeCommTab} from '../shell/storage-settings';
import {addCommNicknameAction, handleCommScrollAction, jumpCommToLatestAction,
  requestCommAction, requestOlderCommAction, sendCommAction} from './panel-actions';

interface CommUiState {
  commDraft: string;
  setCommDraft: (draft: string | ((current: string) => string)) => void;
  commListRef: RefObject<HTMLDivElement>;
  commUserAtBottom: boolean;
  commNewBelow: boolean;
  refreshComm: (tab?: IitcIrisCommTab, older?: boolean) => void;
  requestOlderComm: () => void;
  handleCommScroll: () => void;
  jumpCommToLatest: () => void;
  sendComm: () => void;
  addCommNickname: (nickname: string) => void;
  effects: {
    acknowledge: () => void;
    request: () => undefined | (() => void);
    visibility: () => void;
    restoreScroll: () => void;
    newMessages: () => void;
  };
}

/** Own COMM's UI state/actions; transport and received state remain with their existing owners. */
export function useCommUiState({commState, activeSidePanel, postMessage}: {
  commState: IitcIrisCommState;
  activeSidePanel: IitcIrisSidePanelId | null;
  postMessage: (message: IitcIrisMessage) => void;
}): CommUiState {
  const [commDrafts, setCommDrafts] = useState<Record<IitcIrisCommTab, string>>({all: '', faction: '', alerts: ''});
  const commDraft = commDrafts[commState.tab];
  const setCommDraft = (draft: string | ((current: string) => string)): void => {
    const tab = commState.tab;
    setCommDrafts(current => ({...current, [tab]: typeof draft === 'function' ? draft(current[tab]) : draft}));
  };
  const acknowledgedSends = useRef(new Set<number>());
  const [commUserAtBottom, setCommUserAtBottom] = useState(true);
  const [commNewBelow, setCommNewBelow] = useState(false);
  const commListRef = useRef<HTMLDivElement>(null);
  const olderScrollHeight = useRef<number | null>(null);
  const olderRequestPending = useRef(false);
  const stickToBottom = useRef(true);
  const latestTimestamp = useRef<number | undefined>(undefined);
  const {tab, status, requestOlder, oldMessagesWereAdded, newestTimestamp} = commState;

  const refreshComm = useCallback((nextTab: IitcIrisCommTab = tab, older = false): void => {
    requestCommAction(nextTab, older, postMessage);
  }, [tab, postMessage]);

  const requestOlderComm = (): void => {
    requestOlderCommAction(commState, commListRef.current,
      height => {olderScrollHeight.current = height;}, pending => {olderRequestPending.current = pending;}, refreshComm);
  };
  const handleCommScroll = (): void => {
    handleCommScrollAction(commListRef.current, activeSidePanel, commState, olderRequestPending.current,
      stick => {stickToBottom.current = stick;}, setCommUserAtBottom, setCommNewBelow, requestOlderComm);
  };
  const jumpCommToLatest = (): void => {
    jumpCommToLatestAction(commListRef.current, stick => {stickToBottom.current = stick;}, setCommUserAtBottom, setCommNewBelow);
  };
  const sendComm = (): void => {
    if (commState.sendStatus === 'sending') return;
    jumpCommToLatest();
    sendCommAction(tab, commDraft, setCommDraft, postMessage);
  };
  const addCommNickname = (nickname: string): void => {
    setCommDraft(current => addCommNicknameAction(current, nickname));
    window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.iitc-iris-comm-send-form input')?.focus());
  };

  const acknowledge = useCallback((): void => {
    const {sendId, sendStatus, sendText, tab: sentTab} = commState;
    if (sendId === undefined || sendStatus !== 'sent' || acknowledgedSends.current.has(sendId)) return;
    acknowledgedSends.current.add(sendId);
    setCommDrafts(current => current[sentTab].trim() === sendText ? {...current, [sentTab]: ''} : current);
  }, [commState]);

  const request = useCallback((): undefined | (() => void) => {
    const autoRequest = getCommAutoRequest(activeSidePanel, status, tab);
    if (!autoRequest) return;
    const post = (): void => {storeCommTab(tab); postMessage(autoRequest.message);};
    post();
    const timers = autoRequest.retryDelaysMs.map(ms => window.setTimeout(post, ms));
    return (): void => {timers.forEach(timer => window.clearTimeout(timer));};
  }, [activeSidePanel, status, tab, postMessage]);

  const visibility = useCallback((): void => {
    postMessage({type: IITC_IRIS_MESSAGES.commVisibility, commVisible: activeSidePanel === 'comm'});
  }, [activeSidePanel, postMessage]);

  const restoreScroll = useCallback((): void => {
    if (activeSidePanel !== 'comm') return;
    const list = commListRef.current;
    if (!list) return;
    window.requestAnimationFrame(() => {
      if (requestOlder) {
        if (status === 'loading') return;
        const previousHeight = olderScrollHeight.current;
        if (oldMessagesWereAdded && previousHeight !== null) list.scrollTop = Math.max(0, list.scrollHeight - previousHeight);
        olderScrollHeight.current = null;
        olderRequestPending.current = false;
        return;
      }
      olderScrollHeight.current = null;
      olderRequestPending.current = false;
      if (stickToBottom.current) {
        list.scrollTop = list.scrollHeight;
        setCommUserAtBottom(true);
      }
    });
  }, [activeSidePanel, requestOlder, status, oldMessagesWereAdded]);

  const newMessages = useCallback((): void => {
    if (activeSidePanel !== 'comm') {latestTimestamp.current = newestTimestamp; return;}
    const previous = latestTimestamp.current;
    if (previous !== undefined && newestTimestamp !== undefined && newestTimestamp > previous && !stickToBottom.current) {
      setCommNewBelow(true);
    }
    latestTimestamp.current = newestTimestamp;
  }, [activeSidePanel, newestTimestamp]);

  return {commDraft, setCommDraft, commListRef, commUserAtBottom, commNewBelow, refreshComm, requestOlderComm,
    handleCommScroll, jumpCommToLatest, sendComm, addCommNickname,
    effects: {acknowledge, request, visibility, restoreScroll, newMessages}};
}

/** Keep these registrations at App's former acknowledgment/request/visibility effect position. */
export function useCommRequestEffects({effects}: CommUiState): void {
  const {acknowledge, request, visibility} = effects;
  useEffect(() => acknowledge(), [acknowledge]);
  useEffect((): undefined | (() => void) => request(), [request]);
  useEffect(() => visibility(), [visibility]);
}

/** Register after Missions/Search effects, retaining the original scroll invalidation signals. */
export function useCommScrollEffects({effects}: CommUiState, commState: IitcIrisCommState): void {
  const {restoreScroll, newMessages} = effects;
  useEffect(() => restoreScroll(), [restoreScroll, commState.tab, commState.status, commState.newestTimestamp,
    commState.messages, commState.recent?.length, commState.requestOlder, commState.oldMessagesWereAdded, commState.sendStatus]);
  useEffect(() => newMessages(), [newMessages]);
}
