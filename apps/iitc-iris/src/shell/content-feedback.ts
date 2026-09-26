export interface IitcIrisCopyFeedbackOptions {
  copyText: (text: string) => Promise<void>;
  failureStatus?: string;
  failureTimeoutMs?: number;
  schedule: (callback: () => void, timeoutMs: number) => unknown;
  setStatus: (status: string) => void;
  successStatus: string;
  successTimeoutMs?: number;
}

export function copyTextWithFeedback(text: string, options: IitcIrisCopyFeedbackOptions): void {
  const failureStatus = options.failureStatus ?? 'copy failed';
  const failureTimeoutMs = options.failureTimeoutMs ?? 1600;
  const successTimeoutMs = options.successTimeoutMs ?? 1200;

  void options.copyText(text)
    .then(() => {
      options.setStatus(options.successStatus);
      options.schedule(() => options.setStatus(''), successTimeoutMs);
    })
    .catch(() => {
      options.setStatus(failureStatus);
      options.schedule(() => options.setStatus(''), failureTimeoutMs);
    });
}

export function copyIitcIrisText(text: string, options: Omit<IitcIrisCopyFeedbackOptions, 'copyText' | 'schedule'>): void {
  copyTextWithFeedback(text, {
    ...options,
    copyText: (value) => navigator.clipboard.writeText(value),
    schedule: (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
  });
}
