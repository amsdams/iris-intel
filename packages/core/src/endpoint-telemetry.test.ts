import {describe, expect, it} from 'vitest';
import {parseEndpointStateTelemetry} from './endpoint-telemetry';

describe('endpoint telemetry parsing', () => {
  it('parses endpoint state messages into stable telemetry', () => {
    expect(parseEndpointStateTelemetry({
      type: 'IRIS_ENDPOINT_STATE',
      endpoint: 'entities',
      status: 'in_flight',
      inFlightCount: 2,
      lastSuccessKey: 'a',
      lastSuccessAt: 100,
      lastAttemptKey: 'b',
      lastAttemptAt: 200,
      lastSkipReason: 'fresh',
      nextRefreshAt: 300,
      failureCount: 1,
      cooldownUntil: 400,
    })).toEqual({
      endpoint: 'entities',
      telemetry: {
        status: 'in_flight',
        inFlightKey: null,
        inFlightCount: 2,
        lastSuccessKey: 'a',
        lastSuccessAt: 100,
        lastAttemptKey: 'b',
        lastAttemptAt: 200,
        lastSkipReason: 'fresh',
        nextRefreshAt: 300,
        failureCount: 1,
        cooldownUntil: 400,
      },
    });
  });

  it('rejects unknown endpoint state messages', () => {
    expect(parseEndpointStateTelemetry({type: 'IRIS_ENDPOINT_STATE', endpoint: 'unknown'})).toBe(null);
    expect(parseEndpointStateTelemetry({type: 'IRIS_DATA', endpoint: 'entities'})).toBe(null);
  });
});
