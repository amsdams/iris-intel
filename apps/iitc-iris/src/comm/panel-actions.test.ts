import {describe, expect, it, vi} from 'vitest';
import {
  addCommNicknameAction,
  jumpCommToLatestAction,
  redeemPasscodeAction,
  requestCommAction,
  requestOlderCommAction,
  sendCommAction,
} from './panel-actions';

describe('content-comm-panel-actions', () => {
  it('dispatches comm request message and updates storage', () => {
    const postMessageFn = vi.fn();
    requestCommAction('all', true, postMessageFn);
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_REQUEST_COMM',
      commTab: 'all',
      commOlder: true,
    });
  });

  it('handles request older comm when eligible', () => {
    const setOlderScrollHeight = vi.fn();
    const setOlderPending = vi.fn();
    const refreshComm = vi.fn();
    const listElement = {scrollHeight: 500} as HTMLDivElement;

    const commState = {status: 'idle' as const, tab: 'all' as const, messages: 10, oldestTimestamp: 1000};
    const result = requestOlderCommAction(
      commState,
      listElement,
      setOlderScrollHeight,
      setOlderPending,
      refreshComm
    );

    expect(result).toBe(true);
    expect(setOlderScrollHeight).toHaveBeenCalledWith(500);
    expect(setOlderPending).toHaveBeenCalledWith(true);
    expect(refreshComm).toHaveBeenCalledWith('all', true);
  });

  it('prevents requesting older comm when already loading', () => {
    const refreshComm = vi.fn();
    const commState = {status: 'loading' as const, tab: 'all' as const, messages: 10, oldestTimestamp: 1000};
    const result = requestOlderCommAction(commState, null, vi.fn(), vi.fn(), refreshComm);

    expect(result).toBe(false);
    expect(refreshComm).not.toHaveBeenCalled();
  });

  it('jumps comm scroll to bottom', () => {
    const listElement = {scrollTop: 0, scrollHeight: 1200} as HTMLDivElement;
    const setStickToBottom = vi.fn();
    const setUserAtBottom = vi.fn();
    const setNewBelow = vi.fn();

    jumpCommToLatestAction(listElement, setStickToBottom, setUserAtBottom, setNewBelow);

    expect(listElement.scrollTop).toBe(1200);
    expect(setStickToBottom).toHaveBeenCalledWith(true);
    expect(setUserAtBottom).toHaveBeenCalledWith(true);
    expect(setNewBelow).toHaveBeenCalledWith(false);
  });

  it('sends comm message when draft is non-empty', () => {
    const postMessageFn = vi.fn();
    const setDraft = vi.fn();

    const result = sendCommAction('all', 'hello agent', setDraft, postMessageFn);

    expect(result).toBe(true);
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_SEND_COMM',
      commTab: 'all',
      commMessage: 'hello agent',
    });
    expect(setDraft).not.toHaveBeenCalled();
  });

  it('appends nickname to current draft', () => {
    const draft = addCommNicknameAction('hi ', 'agent1');
    expect(draft).toBe('hi @agent1 ');
  });

  it('redeems passcode when not loading', () => {
    const postMessageFn = vi.fn();
    const setDraft = vi.fn();

    const result = redeemPasscodeAction(
      {status: 'idle', requestState: 'idle'},
      '  2abc3def  ',
      setDraft,
      postMessageFn
    );

    expect(result).toBe(true);
    expect(setDraft).toHaveBeenCalledWith('2abc3def');
    expect(setDraft.mock.invocationCallOrder[0]).toBeLessThan(postMessageFn.mock.invocationCallOrder[0]);
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_REQUEST_PASSCODE',
      passcodeText: '2abc3def',
    });
  });

  it('is a no-op when the draft is empty', () => {
    const postMessage = vi.fn();
    const setDraft = vi.fn();
    const result = redeemPasscodeAction(
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
    const result = redeemPasscodeAction(
      {status: 'loading', requestState: 'loading'},
      'VALIDCODE',
      setDraft,
      postMessage,
    );
    expect(result).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('is a no-op when the draft is empty or whitespace-only', () => {
    const postMessage = vi.fn();
    const setDraft = vi.fn();
    const result = sendCommAction('faction', '   ', setDraft, postMessage);
    expect(result).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
    expect(setDraft).not.toHaveBeenCalled();
  });

  it('is a no-op when the tab is alerts', () => {
    const postMessage = vi.fn();
    const setDraft = vi.fn();
    const result = sendCommAction('alerts', 'hello', setDraft, postMessage);
    expect(result).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
    expect(setDraft).not.toHaveBeenCalled();
  });

  it('strips a leading @ from the supplied nickname', () => {
    expect(addCommNicknameAction('', '@AgentX')).toBe('@AgentX ');
  });

  it('returns the current draft unchanged for an empty nickname', () => {
    expect(addCommNicknameAction('hello', '')).toBe('hello');
  });

  it('trims leading whitespace from the result when the draft was empty', () => {
    expect(addCommNicknameAction('', 'AgentY')).toBe('@AgentY ');
  });
});
