import {describe, expect, it} from 'vitest';
import {
  checkCommIsAtBottom,
  checkShouldRequestOlderComm,
  createCommSendRequest,
} from './content-comm-actions';

describe('content-comm-actions', () => {
  it('detects when COMM scroll is at bottom', () => {
    expect(checkCommIsAtBottom({scrollHeight: 1000, scrollTop: 700, clientHeight: 300})).toBe(true);
    expect(checkCommIsAtBottom({scrollHeight: 1000, scrollTop: 600, clientHeight: 300})).toBe(false);
  });

  it('detects when top scroll threshold is met to load older COMM', () => {
    expect(checkShouldRequestOlderComm(5)).toBe(true);
    expect(checkShouldRequestOlderComm(15)).toBe(false);
  });

  it('creates send COMM message when draft is non-empty', () => {
    const msg = createCommSendRequest('all', 'Hello World');
    expect(msg).not.toBeNull();
    expect(msg?.commMessage).toBe('Hello World');
  });
});
