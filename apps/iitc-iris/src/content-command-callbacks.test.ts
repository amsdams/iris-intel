import {describe, expect, it, vi} from 'vitest';
import {
  addCommNicknameCommand,
  redeemPasscodeCommand,
  refreshInventoryCommand,
  refreshMissionsCommand,
  refreshScoresCommand,
  requestMissionDetailsCommand,
  sendCommCommand,
  zoomToMissionCommand,
} from './content-command-callbacks';
import {IITC_IRIS_MESSAGES} from './messages';

describe('content-command-callbacks', () => {
  // -------------------------------------------------------------------------
  // Simple panel-request commands
  // -------------------------------------------------------------------------

  describe('refreshScoresCommand', () => {
    it('posts a requestScores message', () => {
      const postMessage = vi.fn();
      refreshScoresCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.requestScores});
    });
  });

  describe('refreshInventoryCommand', () => {
    it('posts a requestInventory message', () => {
      const postMessage = vi.fn();
      refreshInventoryCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.requestInventory});
    });
  });

  describe('refreshMissionsCommand', () => {
    it('posts a requestMissions message with the given source', () => {
      const postMessage = vi.fn();
      refreshMissionsCommand(postMessage, 'portal');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissions,
        missionSource: 'portal',
      });
    });

    it('posts a requestMissions message with view source', () => {
      const postMessage = vi.fn();
      refreshMissionsCommand(postMessage, 'view');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissions,
        missionSource: 'view',
      });
    });
  });

  describe('requestMissionDetailsCommand', () => {
    it('posts a requestMissionDetails message with the given guid', () => {
      const postMessage = vi.fn();
      requestMissionDetailsCommand(postMessage, 'mission-abc');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestMissionDetails,
        missionGuid: 'mission-abc',
      });
    });
  });

  describe('zoomToMissionCommand', () => {
    it('posts a missionZoom message', () => {
      const postMessage = vi.fn();
      zoomToMissionCommand(postMessage);
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage).toHaveBeenCalledWith({type: IITC_IRIS_MESSAGES.missionZoom});
    });
  });

  // -------------------------------------------------------------------------
  // redeemPasscodeCommand
  // -------------------------------------------------------------------------

  describe('redeemPasscodeCommand', () => {
    it('posts passcode message and sets draft when valid', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'idle', requestState: 'idle'},
        '  ABC123  ',
        setDraft,
        postMessage,
      );
      expect(result).toBe(true);
      expect(setDraft).toHaveBeenCalledWith('ABC123');
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.requestPasscode,
        passcodeText: 'ABC123',
      });
    });

    it('is a no-op when the draft is empty', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'idle', requestState: 'idle'},
        '   ',
        setDraft,
        postMessage,
      );
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });

    it('is a no-op when passcode is loading', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = redeemPasscodeCommand(
        {status: 'loading', requestState: 'loading'},
        'VALIDCODE',
        setDraft,
        postMessage,
      );
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sendCommCommand
  // -------------------------------------------------------------------------

  describe('sendCommCommand', () => {
    it('posts send-comm message and clears draft when draft is non-empty', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('all', 'hello agent', setDraft, postMessage);
      expect(result).toBe(true);
      expect(postMessage).toHaveBeenCalledWith({
        type: IITC_IRIS_MESSAGES.sendComm,
        commTab: 'all',
        commMessage: 'hello agent',
      });
      expect(setDraft).toHaveBeenCalledWith('');
    });

    it('is a no-op when the draft is empty or whitespace-only', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('faction', '   ', setDraft, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });

    it('is a no-op when the tab is alerts', () => {
      const postMessage = vi.fn();
      const setDraft = vi.fn();
      const result = sendCommCommand('alerts', 'hello', setDraft, postMessage);
      expect(result).toBe(false);
      expect(postMessage).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // addCommNicknameCommand
  // -------------------------------------------------------------------------

  describe('addCommNicknameCommand', () => {
    it('appends @nickname to the current draft', () => {
      expect(addCommNicknameCommand('hi ', 'agent1')).toBe('hi @agent1 ');
    });

    it('strips a leading @ from the supplied nickname', () => {
      expect(addCommNicknameCommand('', '@AgentX')).toBe('@AgentX ');
    });

    it('returns the current draft unchanged for an empty nickname', () => {
      expect(addCommNicknameCommand('hello', '')).toBe('hello');
    });

    it('trims leading whitespace from the result when the draft was empty', () => {
      expect(addCommNicknameCommand('', 'AgentY')).toBe('@AgentY ');
    });
  });
});
