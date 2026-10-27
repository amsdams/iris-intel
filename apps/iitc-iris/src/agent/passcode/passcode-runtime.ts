import {isIitcAuthError} from '../../intel/intel-request';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisPasscodeRewardItem,
  type IitcIrisPasscodeState, type IitcIrisRequestDiagnostics} from '../../messages';

interface PasscodeRuntimeOptions {
  postIntelEndpoint: (endpoint: string, payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
}

interface PasscodeRuntime {
  getState: () => IitcIrisPasscodeState;
  redeemPasscode: (passcodeInput: unknown) => Promise<void>;
  cancelActivePasscodeFetch: () => void;
}

export function createPasscodeRuntime(options: PasscodeRuntimeOptions): PasscodeRuntime {
  const {postIntelEndpoint, getIitcRequestDiagnostics} = options;
  let currentPasscodeAbortController: AbortController | undefined;
  let latestPasscodeState: IitcIrisPasscodeState = {status: 'idle', requestState: 'idle'};

  function numberFromUnknown(value: unknown): number | undefined {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(number) ? number : undefined;
  }

  function cancelActivePasscodeFetch(): void {
    currentPasscodeAbortController?.abort();
    currentPasscodeAbortController = undefined;
  }

  function postPasscodeState(): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.passcodeStatus,
      passcode: latestPasscodeState,
      requestDiagnostics: getIitcRequestDiagnostics(),
    } satisfies IitcIrisMessage, '*');
  }

  function sanitizePasscode(value: unknown): string {
    return typeof value === 'string' ? value.replace(/[^\x20-\x7E]+/g, '').trim() : '';
  }

  function parsePasscodeRewards(response: unknown, passcode: string, elapsedMs: number): IitcIrisPasscodeState {
    const data = response && typeof response === 'object' ? response as {rewards?: unknown} : {};
    const rewards = data.rewards && typeof data.rewards === 'object' ? data.rewards as {
      ap?: unknown;
      xm?: unknown;
      other?: unknown;
      inventory?: unknown;
    } : undefined;
    if (!rewards) throw new Error('unexpected passcode response');

    const items: IitcIrisPasscodeRewardItem[] = [];
    const inventory = Array.isArray(rewards.inventory) ? rewards.inventory : [];
    for (const entry of inventory) {
      const type = entry && typeof entry === 'object' ? entry as {name?: unknown; awards?: unknown} : {};
      const label = typeof type.name === 'string' ? type.name : 'Item';
      const awards = Array.isArray(type.awards) ? type.awards : [];
      for (const award of awards) {
        const item = award && typeof award === 'object' ? award as {count?: unknown; level?: unknown} : {};
        items.push({
          label,
          count: numberFromUnknown(item.count) ?? 1,
          level: numberFromUnknown(item.level),
        });
      }
    }

    const other = Array.isArray(rewards.other)
      ? rewards.other.filter((item): item is string => typeof item === 'string')
      : undefined;
    const ap = numberFromUnknown(rewards.ap);
    const xm = numberFromUnknown(rewards.xm);

    return {
      status: other?.length || items.length > 0 || (ap ?? 0) > 0 || (xm ?? 0) > 0 ? 'ready' : 'empty',
      requestState: 'ready',
      passcode,
      ap,
      xm,
      other,
      items,
      elapsedMs,
    };
  }

  async function redeemPasscode(passcodeInput: unknown): Promise<void> {
    const passcode = sanitizePasscode(passcodeInput);
    cancelActivePasscodeFetch();
    if (!passcode) {
      latestPasscodeState = {status: 'error', requestState: 'error', error: 'missing passcode'};
      postPasscodeState();
      return;
    }

    const abortController = new AbortController();
    currentPasscodeAbortController = abortController;
    const startedAt = performance.now();
    latestPasscodeState = {
      ...latestPasscodeState,
      status: 'loading',
      requestState: 'loading',
      passcode,
      error: undefined,
    };
    postPasscodeState();

    try {
      const response = await postIntelEndpoint('redeemReward', {passcode}, abortController.signal);
      abortController.signal.throwIfAborted();
      latestPasscodeState = parsePasscodeRewards(response, passcode, performance.now() - startedAt);
      postPasscodeState();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      latestPasscodeState = {
        ...latestPasscodeState,
        status,
        requestState: status,
        passcode,
        elapsedMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
      postPasscodeState();
    } finally {
      if (currentPasscodeAbortController === abortController) currentPasscodeAbortController = undefined;
    }
  }

  return {getState: () => latestPasscodeState, redeemPasscode, cancelActivePasscodeFetch};
}
