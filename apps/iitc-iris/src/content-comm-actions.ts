import {createSendCommMessage} from './content-outbound-messages';
import type {IitcIrisCommTab, IitcIrisMessage} from './messages';

export function checkCommIsAtBottom(list: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}): boolean {
  return list.scrollHeight - list.scrollTop - list.clientHeight <= 10;
}

export function checkShouldRequestOlderComm(scrollTop: number): boolean {
  return scrollTop <= 8;
}

export function createCommSendRequest(
  tab: IitcIrisCommTab,
  commDraft: string
): IitcIrisMessage | null {
  return createSendCommMessage(tab, commDraft);
}
