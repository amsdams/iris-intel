import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createMapRefreshActivity} from './map-refresh-activity';

describe('automatic refresh activity', () => {
  let page: EventTarget & {hidden: boolean};
  beforeEach(() => {
    vi.useFakeTimers();
    page = Object.assign(new EventTarget(), {hidden: false});
    vi.stubGlobal('document', page);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('suspends hidden/idle pages, resumes once on activity and removes old-map listeners', () => {
    const controller = new AbortController();
    const resume = vi.fn();
    const activity = createMapRefreshActivity(controller.signal, resume);
    expect(activity.isIdle()).toBe(false);
    vi.advanceTimersByTime(15 * 60_000);
    expect(activity.isIdle()).toBe(true);
    page.dispatchEvent(new Event('keydown'));
    expect(resume).toHaveBeenCalledOnce();
    expect(activity.isIdle()).toBe(false);
    page.hidden = true;
    page.dispatchEvent(new Event('visibilitychange'));
    expect(activity.isIdle()).toBe(true);
    page.hidden = false;
    page.dispatchEvent(new Event('visibilitychange'));
    expect(resume).toHaveBeenCalledTimes(2);
    page.dispatchEvent(new Event('keydown'));
    expect(resume).toHaveBeenCalledTimes(2);
    controller.abort();
    vi.advanceTimersByTime(15 * 60_000);
    page.dispatchEvent(new Event('keydown'));
    expect(resume).toHaveBeenCalledTimes(2);
  });
});
