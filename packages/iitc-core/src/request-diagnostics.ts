export interface IitcActiveRequest {
  id: number;
  endpoint: string;
  group?: string;
  startedAt: number;
}

export interface IitcRequestDiagnosticsState {
  nextRequestId: number;
  active: IitcActiveRequest[];
}

export interface IitcRequestDiagnostics {
  activeRequests: number;
  activeByEndpoint: Record<string, number>;
  active: {
    id: number;
    endpoint: string;
    group?: string;
    elapsedMs: number;
  }[];
}

export interface IitcRequestBeginResult {
  state: IitcRequestDiagnosticsState;
  request: IitcActiveRequest;
}

export function createIitcRequestDiagnosticsState(nextRequestId = 1): IitcRequestDiagnosticsState {
  return {
    nextRequestId,
    active: [],
  };
}

export function beginIitcRequestDiagnostics(
  state: IitcRequestDiagnosticsState,
  endpoint: string,
  startedAt: number,
  group?: string,
): IitcRequestBeginResult {
  const request = {
    id: state.nextRequestId,
    endpoint,
    group,
    startedAt,
  };

  return {
    request,
    state: {
      nextRequestId: state.nextRequestId + 1,
      active: [...state.active, request],
    },
  };
}

export function finishIitcRequestDiagnostics(
  state: IitcRequestDiagnosticsState,
  requestId: number,
): IitcRequestDiagnosticsState {
  const active = state.active.filter((request) => request.id !== requestId);
  return active.length === state.active.length ? state : {...state, active};
}

export function createIitcRequestDiagnosticsSnapshot(
  state: IitcRequestDiagnosticsState,
  now: number,
): IitcRequestDiagnostics {
  const activeByEndpoint: Record<string, number> = {};
  const active = state.active.map((request) => {
    activeByEndpoint[request.endpoint] = (activeByEndpoint[request.endpoint] ?? 0) + 1;
    return {
      id: request.id,
      endpoint: request.endpoint,
      group: request.group,
      elapsedMs: Math.round(now - request.startedAt),
    };
  });

  return {
    activeRequests: active.length,
    activeByEndpoint,
    active,
  };
}
