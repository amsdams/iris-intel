import {createCommSendRequest} from './content-comm-actions';
import {
  createRequestPasscodeMessage,
  formatCommDraftWithNickname,
} from './content-outbound-messages';
import type {IitcIrisCommTab, IitcIrisMessage} from './messages';

export function buildCommSendAction(
  tab: IitcIrisCommTab,
  draft: string
): {message: IitcIrisMessage} | null {
  const msg = createCommSendRequest(tab, draft);
  if (!msg) return null;
  return {message: msg};
}

export function appendCommNickname(currentDraft: string, nickname: string): string {
  return formatCommDraftWithNickname(currentDraft, nickname);
}

export function buildPasscodeRedeemAction(
  passcodeDraft: string
): {cleanPasscode: string; message: IitcIrisMessage} | null {
  const res = createRequestPasscodeMessage(passcodeDraft);
  if (!res) return null;
  return {
    cleanPasscode: res.cleanPasscode,
    message: res.message,
  };
}
