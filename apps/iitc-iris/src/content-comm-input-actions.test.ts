import {describe, expect, it} from 'vitest';
import {
  appendCommNickname,
  buildCommSendAction,
  buildPasscodeRedeemAction,
} from './content-comm-input-actions';
import {IITC_IRIS_MESSAGES} from './messages';

describe('content-comm-input-actions', () => {
  it('builds COMM send action for non-empty draft', () => {
    const res = buildCommSendAction('all', 'Hello agent');
    expect(res).not.toBeNull();
    expect(res?.message.type).toBe(IITC_IRIS_MESSAGES.sendComm);
  });

  it('returns null for empty COMM draft', () => {
    expect(buildCommSendAction('all', '   ')).toBeNull();
  });

  it('appends nickname to draft', () => {
    expect(appendCommNickname('Hi', 'AgentName')).toBe('Hi @AgentName ');
  });

  it('builds passcode redeem action', () => {
    const res = buildPasscodeRedeemAction('  abc1234  ');
    expect(res).toEqual({
      cleanPasscode: 'abc1234',
      message: {
        type: IITC_IRIS_MESSAGES.requestPasscode,
        passcodeText: 'abc1234',
      },
    });
  });
});
