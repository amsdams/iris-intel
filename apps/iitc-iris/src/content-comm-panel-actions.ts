import type {IitcIrisCommState, IitcIrisCommTab, IitcIrisMessage, IitcIrisPasscodeState} from './messages';
import {
  createRequestCommMessage,
} from './content-outbound-messages';
import {
  checkCommIsAtBottom,
  checkShouldRequestOlderComm,
} from './content-comm-actions';
import {
  appendCommNickname,
  buildCommSendAction,
  buildPasscodeRedeemAction,
} from './content-comm-input-actions';
import {storeCommTab} from './content-storage-settings';

export function requestCommAction(
  tab: IitcIrisCommTab | unknown,
  older: unknown = false,
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): void {
  const commTab: IitcIrisCommTab = typeof tab === 'string' ? (tab as IitcIrisCommTab) : 'all';
  const isOlder = typeof older === 'boolean' ? older : false;
  storeCommTab(commTab);
  postMessageFn(createRequestCommMessage(commTab, isOlder));
}

export function requestOlderCommAction(
  commState: IitcIrisCommState,
  listElement: HTMLDivElement | null,
  setOlderScrollHeight: (height: number | null) => void,
  setOlderPending: (pending: boolean) => void,
  refreshComm: (tab: IitcIrisCommTab, older: boolean) => void
): boolean {
  if (commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0) {
    return false;
  }
  setOlderScrollHeight(listElement?.scrollHeight ?? null);
  setOlderPending(true);
  refreshComm(commState.tab, true);
  return true;
}

export function handleCommScrollAction(
  listElement: HTMLDivElement | null,
  activeSidePanel: string | null,
  commState: IitcIrisCommState,
  isOlderPending: boolean,
  setStickToBottom: (stick: boolean) => void,
  setUserAtBottom: (atBottom: boolean) => void,
  setNewBelow: (newBelow: boolean) => void,
  requestOlder: () => void
): void {
  if (!listElement || activeSidePanel !== 'comm' || commState.status === 'loading' || isOlderPending) {
    return;
  }
  const atBottom = checkCommIsAtBottom(listElement);
  setStickToBottom(atBottom);
  setUserAtBottom(atBottom);
  if (atBottom) setNewBelow(false);
  if (checkShouldRequestOlderComm(listElement.scrollTop)) {
    requestOlder();
  }
}

export function jumpCommToLatestAction(
  listElement: HTMLDivElement | null,
  setStickToBottom: (stick: boolean) => void,
  setUserAtBottom: (atBottom: boolean) => void,
  setNewBelow: (newBelow: boolean) => void
): void {
  if (!listElement) return;
  listElement.scrollTop = listElement.scrollHeight;
  setStickToBottom(true);
  setUserAtBottom(true);
  setNewBelow(false);
}

export function sendCommAction(
  commTab: IitcIrisCommTab,
  draft: string,
  setDraft: (draft: string) => void,
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): boolean {
  const res = buildCommSendAction(commTab, draft);
  if (!res) return false;
  postMessageFn(res.message);
  setDraft('');
  return true;
}

export function addCommNicknameAction(
  currentDraft: string,
  nickname: string
): string {
  return appendCommNickname(currentDraft, nickname);
}

export function redeemPasscodeAction(
  passcodeState: IitcIrisPasscodeState,
  draft: string,
  setDraft: (draft: string) => void,
  postMessageFn: (message: IitcIrisMessage) => void = (msg) => window.postMessage(msg, '*')
): boolean {
  if (passcodeState.status === 'loading') return false;
  const res = buildPasscodeRedeemAction(draft);
  if (!res) return false;
  setDraft(res.cleanPasscode);
  postMessageFn(res.message);
  return true;
}
