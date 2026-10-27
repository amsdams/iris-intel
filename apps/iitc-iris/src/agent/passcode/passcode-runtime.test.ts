import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPasscodeRuntime} from './passcode-runtime';
import type {IitcIrisRequestDiagnostics} from '../../messages';

type Options = Parameters<typeof createPasscodeRuntime>[0];
describe('Passcode runtime requests', () => {
  let post: ReturnType<typeof vi.fn<Options['postIntelEndpoint']>>;
  let runtime: ReturnType<typeof createPasscodeRuntime>;
  beforeEach(() => {
    vi.stubGlobal('window', {postMessage: vi.fn()});
    post = vi.fn<Options['postIntelEndpoint']>().mockResolvedValue({rewards: {ap: '1000', xm: '2000', other: ['Badge', 4],
      inventory: [{name: 'XMP Burster', awards: [{count: '3', level: '8'}, {}]}]}});
    runtime = createPasscodeRuntime({postIntelEndpoint: post,
      getIitcRequestDiagnostics: () => ({}) as IitcIrisRequestDiagnostics});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('strips non-ASCII controls, trims the submitted code and converts rewards', async () => {
    await runtime.redeemPasscode(' \nco\u200bde\t ');
    expect(post).toHaveBeenCalledExactlyOnceWith('redeemReward', {passcode: 'code'}, expect.any(AbortSignal));
    expect(runtime.getState()).toMatchObject({status: 'ready', requestState: 'ready', passcode: 'code', ap: 1000, xm: 2000,
      other: ['Badge'], items: [{label: 'XMP Burster', count: 3, level: 8}, {label: 'XMP Burster', count: 1}]});
  });

  it('does not submit empty or non-string input', async () => {
    await runtime.redeemPasscode(' \t\n ');
    await runtime.redeemPasscode(undefined);
    expect(post).not.toHaveBeenCalled();
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'missing passcode'});
  });

  it('distinguishes an empty reward from a malformed response', async () => {
    post.mockResolvedValueOnce({rewards: {}}).mockResolvedValueOnce({result: false});
    await runtime.redeemPasscode('empty');
    expect(runtime.getState()).toMatchObject({status: 'empty', requestState: 'ready'});
    await runtime.redeemPasscode('malformed');
    expect(runtime.getState()).toMatchObject({status: 'error', error: 'unexpected passcode response'});
  });

  it('ignores superseded redemption results and cancels pending requests on panel closure', async () => {
    let finish!: (value: unknown) => void;
    post.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const old = runtime.redeemPasscode('old');
    await runtime.redeemPasscode('new');
    expect(post.mock.calls[0][2]?.aborted).toBe(true);
    finish({rewards: {ap: 9999}});
    await old;
    expect(runtime.getState()).toMatchObject({passcode: 'new', ap: 1000});
    post.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const pending = runtime.redeemPasscode('cancelled');
    runtime.cancelActivePasscodeFetch();
    finish({rewards: {ap: 123}});
    await pending;
    expect(runtime.getState()).toMatchObject({status: 'loading', passcode: 'cancelled', ap: 1000});
    expect(post.mock.calls[2][2]?.aborted).toBe(true);
  });

  it('preserves auth and server error feedback', async () => {
    post.mockRejectedValueOnce(new Error('redeemReward returned login html HTTP 200')).mockRejectedValueOnce(new Error('already redeemed'));
    await runtime.redeemPasscode('auth');
    expect(runtime.getState().status).toBe('auth');
    await runtime.redeemPasscode('used');
    expect(runtime.getState()).toMatchObject({status: 'error', passcode: 'used', error: 'already redeemed'});
  });
});
