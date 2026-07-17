import {describe, expect, it} from 'vitest';
import {copyTextWithFeedback} from './content-feedback';

describe('IITC IRIS content feedback', () => {
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
