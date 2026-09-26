import {describe, expect, it, vi} from 'vitest';
import {
  addCommNicknameAction,
  jumpCommToLatestAction,
  redeemPasscodeAction,
  requestCommAction,
  requestOlderCommAction,
  sendCommAction,
} from './content-comm-panel-actions';

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
    expect(setDraft).toHaveBeenCalledWith('');
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
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_REQUEST_PASSCODE',
      passcodeText: '2abc3def',
    });
  });
});
