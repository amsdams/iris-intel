export type EndpointRequestSkipReason = 'in-flight' | 'cooldown' | 'fresh' | 'queued';

export interface EvaluateEndpointRequestGateOptions {
  key: string;
  now?: number;
  force?: boolean;
  inFlightKeys?: ReadonlySet<string>;
  cooldownUntil?: number | null;
  lastSuccessKey?: string | null;
  lastSuccessAt?: number | null;
  freshnessMs: number;
  queued?: boolean;
}

export type EndpointRequestGateResult =
  | {
      shouldRun: true;
      skipReason: null;
      nextRefreshAt: null;
    }
  | {
      shouldRun: false;
      skipReason: EndpointRequestSkipReason;
      nextRefreshAt: number | null;
    };

export function evaluateEndpointRequestGate(
  options: EvaluateEndpointRequestGateOptions,
): EndpointRequestGateResult {
  const now = options.now ?? Date.now();

  if (options.inFlightKeys?.has(options.key)) {
    return {
      shouldRun: false,
      skipReason: 'in-flight',
      nextRefreshAt: null,
    };
  }

  if (options.cooldownUntil !== null && options.cooldownUntil !== undefined && now < options.cooldownUntil) {
    return {
      shouldRun: false,
      skipReason: 'cooldown',
      nextRefreshAt: options.cooldownUntil,
    };
  }

  if (
    !options.force
    && options.lastSuccessKey === options.key
    && options.lastSuccessAt !== null
    && options.lastSuccessAt !== undefined
    && now - options.lastSuccessAt < options.freshnessMs
  ) {
    return {
      shouldRun: false,
      skipReason: 'fresh',
      nextRefreshAt: options.lastSuccessAt + options.freshnessMs,
    };
  }

  if (options.queued) {
    return {
      shouldRun: false,
      skipReason: 'queued',
      nextRefreshAt: null,
    };
  }

  return {
    shouldRun: true,
    skipReason: null,
    nextRefreshAt: null,
  };
}
