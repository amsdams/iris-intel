export interface IitcIrisCopyFeedbackOptions {
  copyText: (text: string) => Promise<void>;
  failureStatus?: string;
  failureTimeoutMs?: number;
  schedule: (callback: () => void, timeoutMs: number) => unknown;
  cancelScheduled?: (timer: unknown) => void;
  setStatus: (status: string) => void;
  successStatus: string;
  successTimeoutMs?: number;
}

type StatusSetter = (status: string) => void;
export type CopyFeedbackUpdate = string | ((current: string) => string);
interface FeedbackOwner {
  publish: StatusSetter;
  disposed: boolean;
  pending?: {cancel: () => void};
}
// Preserve the existing setter-based copy API while keeping each feedback area's operation independent.
const feedbackOwners = new WeakMap<StatusSetter, FeedbackOwner>();

function cancelPending(owner: FeedbackOwner): void {
  const pending = owner.pending;
  owner.pending = undefined;
  pending?.cancel();
}

export function createCopyFeedbackOwner(publish: (status: CopyFeedbackUpdate) => void): {
  setStatus: (status: CopyFeedbackUpdate) => void; dispose: () => void;
} {
  const owner: FeedbackOwner = {publish, disposed: false};
  const setStatus = (status: CopyFeedbackUpdate): void => {
    cancelPending(owner);
    if (!owner.disposed) publish(status);
  };
  feedbackOwners.set(setStatus, owner);
  return {setStatus, dispose: (): void => {owner.disposed = true; cancelPending(owner);}};
}

export function copyTextWithFeedback(text: string, options: IitcIrisCopyFeedbackOptions): void {
  const failureStatus = options.failureStatus ?? 'copy failed';
  const failureTimeoutMs = options.failureTimeoutMs ?? 1600;
  const successTimeoutMs = options.successTimeoutMs ?? 1200;

  const owner: FeedbackOwner = feedbackOwners.get(options.setStatus) ?? {publish: options.setStatus, disposed: false};
  feedbackOwners.set(options.setStatus, owner);
  if (owner.disposed) return;
  cancelPending(owner);
  let timer: unknown;
  const operation = {cancel: (): void => {if (timer !== undefined) options.cancelScheduled?.(timer);}};
  owner.pending = operation;
  const show = (status: string, timeoutMs: number): void => {
    if (owner.disposed || owner.pending !== operation) return;
    owner.publish(status);
    timer = options.schedule(() => {
      if (owner.disposed || owner.pending !== operation) return;
      owner.pending = undefined;
      owner.publish('');
    }, timeoutMs);
  };
  try {
    void options.copyText(text).then(() => show(options.successStatus, successTimeoutMs))
      .catch(() => show(failureStatus, failureTimeoutMs));
  } catch { show(failureStatus, failureTimeoutMs); }
}

export function copyIitcIrisText(text: string, options: Omit<IitcIrisCopyFeedbackOptions, 'copyText' | 'schedule' | 'cancelScheduled'>): void {
  copyTextWithFeedback(text, {
    ...options,
    copyText: (value) => navigator.clipboard.writeText(value),
    schedule: (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
    cancelScheduled: timer => window.clearTimeout(timer as number),
  });
}
