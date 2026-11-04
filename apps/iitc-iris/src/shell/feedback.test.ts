import {describe, expect, it, vi} from 'vitest';
import {copyTextWithFeedback, createCopyFeedbackOwner, type CopyFeedbackUpdate} from './feedback';

describe('IITC IRIS content feedback', () => {
  function area(): {
    owner: ReturnType<typeof createCopyFeedbackOwner>;
    publish: ReturnType<typeof vi.fn<(value: CopyFeedbackUpdate) => void>>;
    callbacks: (() => void)[];
    cancelScheduled: ReturnType<typeof vi.fn<(timer: unknown) => void>>;
    copy: (label: string, copyText?: () => Promise<void>) => void;
  } {
    const publish = vi.fn<(value: CopyFeedbackUpdate) => void>();
    const owner = createCopyFeedbackOwner(publish);
    const callbacks: (() => void)[] = [];
    const cancelScheduled = vi.fn<(timer: unknown) => void>();
    const copy = (label: string, copyText: () => Promise<void> = async () => undefined): void => {
      copyTextWithFeedback(label, {setStatus: owner.setStatus, copyText,
        schedule: callback => callbacks.push(callback), cancelScheduled, successStatus: label});
    };
    return {owner, publish, callbacks, cancelScheduled, copy};
  }
  it('cancels old timers and guards their callbacks when a newer copy starts', async () => {
    const state = area();
    state.copy('first'); await Promise.resolve();
    state.copy('second'); await Promise.resolve();
    expect(state.cancelScheduled).toHaveBeenCalledWith(1);
    state.callbacks[0]();
    expect(state.publish.mock.calls.map(([value]) => value)).toEqual(['first', 'second']);
    state.callbacks[1]();
    expect(state.publish).toHaveBeenLastCalledWith('');
  });
  it('ignores both successful and failed late completions of superseded copies', async () => {
    for (const failure of [false, true]) {
      const state = area();
      let finish!: () => void;
      state.copy('first', () => new Promise<void>((resolve, reject) => {finish = failure ? (): void => reject(new Error('old failure')) : resolve;}));
      state.copy('second'); await Promise.resolve();
      finish(); await Promise.resolve(); await Promise.resolve();
      expect(state.publish.mock.calls.map(([value]) => value)).toEqual(['second']);
      expect(state.callbacks).toHaveLength(1);
    }
  });
  it('keeps areas independent and cancels timers on disposal', async () => {
    const first = area(); const second = area();
    first.copy('portal'); second.copy('system'); await Promise.resolve();
    first.owner.dispose(); first.callbacks[0]();
    expect(first.cancelScheduled).toHaveBeenCalledWith(1);
    expect(first.publish).toHaveBeenCalledTimes(1);
    second.callbacks[0]();
    expect(second.publish).toHaveBeenLastCalledWith('');
  });
  it('ignores pending clipboard results after disposal and refuses further copies', async () => {
    const state = area(); let finish!: () => void;
    state.copy('pending', () => new Promise<void>(resolve => {finish = resolve;}));
    state.owner.dispose(); finish(); await Promise.resolve();
    state.copy('after disposal'); await Promise.resolve();
    expect(state.publish).not.toHaveBeenCalled();
    expect(state.callbacks).toEqual([]);
  });
  it('lets newer non-copy feedback invalidate both pending copies and scheduled clears', async () => {
    const state = area();
    state.copy('copied'); await Promise.resolve();
    state.owner.setStatus('imported'); state.callbacks[0]();
    expect(state.publish).toHaveBeenLastCalledWith('imported');
    let finish!: () => void;
    state.copy('pending', () => new Promise<void>(resolve => {finish = resolve;}));
    state.owner.setStatus('new import'); finish(); await Promise.resolve();
    expect(state.publish).toHaveBeenLastCalledWith('new import');
  });
  it('reports synchronous clipboard failures', () => {
    const state = area();
    state.copy('copy', () => {throw new Error('clipboard unavailable');});
    expect(state.publish).toHaveBeenLastCalledWith('copy failed');
  });
  it('reports and clears successful copies with the default timeout', async () => {
    const statuses: string[] = [];
    const schedules: {callback: () => void; timeoutMs: number}[] = [];
    copyTextWithFeedback('text', {
      copyText: async () => undefined,
      schedule: (callback, timeoutMs) => schedules.push({callback, timeoutMs}),
      setStatus: (status) => statuses.push(status),
      successStatus: 'copied',
    });

    await Promise.resolve();
    expect(statuses).toEqual(['copied']);
    expect(schedules).toHaveLength(1);
    expect(schedules[0].timeoutMs).toBe(1200);
    schedules[0].callback();
    expect(statuses).toEqual(['copied', '']);
  });

  it('reports and clears failed copies with configurable feedback', async () => {
    const statuses: string[] = [];
    const schedules: {callback: () => void; timeoutMs: number}[] = [];
    copyTextWithFeedback('text', {
      copyText: () => Promise.reject(new Error('denied')),
      failureStatus: 'unable to copy',
      failureTimeoutMs: 1800,
      schedule: (callback, timeoutMs) => schedules.push({callback, timeoutMs}),
      setStatus: (status) => statuses.push(status),
      successStatus: 'copied',
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(statuses).toEqual(['unable to copy']);
    expect(schedules).toHaveLength(1);
    expect(schedules[0].timeoutMs).toBe(1800);
    schedules[0].callback();
    expect(statuses).toEqual(['unable to copy', '']);
  });
});
