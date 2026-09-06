import {
  IITC_IRIS_MESSAGES,
  type IitcIrisCommTab,
  type IitcIrisMessage,
  type IitcIrisMissionSource,
} from './messages';

export function createRequestCommMessage(tab: IitcIrisCommTab, older = false): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.requestComm,
    commTab: tab,
    commOlder: older,
  };
}

export function createSendCommMessage(tab: IitcIrisCommTab, message: string): IitcIrisMessage | null {
  const trimmed = message.trim();
  if (!trimmed || tab === 'alerts') return null;
  return {
    type: IITC_IRIS_MESSAGES.sendComm,
    commTab: tab,
    commMessage: trimmed,
  };
}

export function createRequestScoresMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.requestScores,
  };
}

export function createRequestInventoryMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.requestInventory,
  };
}

export function createRequestMissionsMessage(source: IitcIrisMissionSource = 'view'): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.requestMissions,
    missionSource: source,
  };
}

export function createRequestMissionDetailsMessage(missionGuid: string): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.requestMissionDetails,
    missionGuid,
  };
}

export function createMissionZoomMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.missionZoom,
  };
}

export function createRequestPasscodeMessage(rawPasscode: string): { message: IitcIrisMessage; cleanPasscode: string } | null {
  const cleanPasscode = rawPasscode.replace(/[^\x20-\x7E]+/g, '').trim();
  if (!cleanPasscode) return null;
  return {
    cleanPasscode,
    message: {
      type: IITC_IRIS_MESSAGES.requestPasscode,
      passcodeText: cleanPasscode,
    },
  };
}

export function createCancelPanelRequestsMessage(): IitcIrisMessage {
  return {
    type: IITC_IRIS_MESSAGES.cancelPanelRequests,
  };
}

export function formatCommDraftWithNickname(currentDraft: string, nickname: string): string {
  const normalized = nickname.replace(/^@/, '').trim();
  if (!normalized) return currentDraft;
  return `${currentDraft.trim()} @${normalized} `.trimStart();
}
