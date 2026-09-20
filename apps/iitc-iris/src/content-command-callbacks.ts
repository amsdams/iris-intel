import {
  createMissionZoomMessage,
  createRequestInventoryMessage,
  createRequestMissionDetailsMessage,
  createRequestMissionsMessage,
  createRequestScoresMessage,
} from './content-outbound-messages';
import {
  addCommNicknameAction,
  redeemPasscodeAction,
  sendCommAction,
} from './content-comm-panel-actions';
import type {
  IitcIrisCommTab,
  IitcIrisMessage,
  IitcIrisMissionSource,
  IitcIrisPasscodeState,
} from './messages';

/** Narrow postMessage adapter type accepted by every command in this module. */
export type PostMessageFn = (message: IitcIrisMessage) => void;

// ---------------------------------------------------------------------------
// Simple panel-request commands
// ---------------------------------------------------------------------------

export function refreshScoresCommand(postMessage: PostMessageFn): void {
  postMessage(createRequestScoresMessage());
}

export function refreshInventoryCommand(postMessage: PostMessageFn): void {
  postMessage(createRequestInventoryMessage());
}

/**
 * Post a request-missions message.
 *
 * The caller (content.tsx) is responsible for supplying the resolved source,
 * including the stale-closure-safe `missionsState.source ?? 'view'` default.
 */
export function refreshMissionsCommand(postMessage: PostMessageFn, source: IitcIrisMissionSource): void {
  postMessage(createRequestMissionsMessage(source));
}

export function requestMissionDetailsCommand(postMessage: PostMessageFn, missionGuid: string): void {
  postMessage(createRequestMissionDetailsMessage(missionGuid));
}

export function zoomToMissionCommand(postMessage: PostMessageFn): void {
  postMessage(createMissionZoomMessage());
}

// ---------------------------------------------------------------------------
// Passcode / COMM commands
// ---------------------------------------------------------------------------

/**
 * Attempt to redeem a passcode.
 *
 * No-ops when `passcodeState.status === 'loading'` or the draft is empty/
 * whitespace. Returns `true` when the message was posted, `false` otherwise.
 * Delegates to `redeemPasscodeAction` from `content-comm-panel-actions`.
 */
export function redeemPasscodeCommand(
  passcodeState: IitcIrisPasscodeState,
  passcodeDraft: string,
  setPasscodeDraft: (draft: string) => void,
  postMessage: PostMessageFn,
): boolean {
  return redeemPasscodeAction(passcodeState, passcodeDraft, setPasscodeDraft, postMessage);
}

/**
 * Attempt to send a COMM message.
 *
 * No-ops when the draft is empty/whitespace or the active tab is `'alerts'`.
 * Returns `true` when the message was posted, `false` otherwise.
 * Delegates to `sendCommAction` from `content-comm-panel-actions`.
 */
export function sendCommCommand(
  commTab: IitcIrisCommTab,
  commDraft: string,
  setCommDraft: (draft: string) => void,
  postMessage: PostMessageFn,
): boolean {
  return sendCommAction(commTab, commDraft, setCommDraft, postMessage);
}

/**
 * Append `@nickname` to the current COMM draft.
 *
 * Returns the new draft string; the caller is responsible for calling the
 * state setter. Delegates to `addCommNicknameAction` from
 * `content-comm-panel-actions`.
 */
export function addCommNicknameCommand(currentDraft: string, nickname: string): string {
  return addCommNicknameAction(currentDraft, nickname);
}
