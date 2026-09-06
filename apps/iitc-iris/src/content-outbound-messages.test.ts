import { describe, expect, it } from 'vitest';
import {
  createCancelPanelRequestsMessage,
  createMissionZoomMessage,
  createRequestCommMessage,
  createRequestInventoryMessage,
  createRequestMissionDetailsMessage,
  createRequestMissionsMessage,
  createRequestPasscodeMessage,
  createRequestScoresMessage,
  createSendCommMessage,
  formatCommDraftWithNickname,
} from './content-outbound-messages';
import { IITC_IRIS_MESSAGES } from './messages';

describe('content-outbound-messages', () => {
  it('creates request comm message', () => {
    expect(createRequestCommMessage('all', true)).toEqual({
      type: IITC_IRIS_MESSAGES.requestComm,
      commTab: 'all',
      commOlder: true,
    });
  });

  it('creates send comm message and rejects alerts or whitespace', () => {
    expect(createSendCommMessage('alerts', 'hello')).toBeNull();
    expect(createSendCommMessage('faction', '   ')).toBeNull();
    expect(createSendCommMessage('faction', '  hello agent  ')).toEqual({
      type: IITC_IRIS_MESSAGES.sendComm,
      commTab: 'faction',
      commMessage: 'hello agent',
    });
  });

  it('creates simple panel request messages', () => {
    expect(createRequestScoresMessage()).toEqual({ type: IITC_IRIS_MESSAGES.requestScores });
    expect(createRequestInventoryMessage()).toEqual({ type: IITC_IRIS_MESSAGES.requestInventory });
    expect(createRequestMissionsMessage('portal')).toEqual({
      type: IITC_IRIS_MESSAGES.requestMissions,
      missionSource: 'portal',
    });
    expect(createRequestMissionDetailsMessage('mission-123')).toEqual({
      type: IITC_IRIS_MESSAGES.requestMissionDetails,
      missionGuid: 'mission-123',
    });
    expect(createMissionZoomMessage()).toEqual({ type: IITC_IRIS_MESSAGES.missionZoom });
    expect(createCancelPanelRequestsMessage()).toEqual({ type: IITC_IRIS_MESSAGES.cancelPanelRequests });
  });

  it('sanitizes and creates passcode request messages', () => {
    expect(createRequestPasscodeMessage('  ')).toBeNull();
    expect(createRequestPasscodeMessage('  PASS-123 \u0000 ')).toEqual({
      cleanPasscode: 'PASS-123',
      message: {
        type: IITC_IRIS_MESSAGES.requestPasscode,
        passcodeText: 'PASS-123',
      },
    });
  });

  it('formats comm draft when mentioning nicknames', () => {
    expect(formatCommDraftWithNickname('', '@AgentX')).toBe('@AgentX ');
    expect(formatCommDraftWithNickname('Hey ', 'AgentY')).toBe('Hey @AgentY ');
  });
});
