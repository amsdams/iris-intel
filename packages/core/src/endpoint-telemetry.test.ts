import {describe, expect, it} from 'vitest';
import {
  getEndpointTelemetryNextDelay,
  parseEndpointStateTelemetry,
  shouldSkipEndpointTelemetryRequest,
  type EndpointTelemetry,
} from './endpoint-telemetry';

function telemetry(partial: Partial<EndpointTelemetry> = {}): EndpointTelemetry {
  return {
    status: 'idle',
    inFlightKey: null,
    inFlightCount: 0,
    lastSuccessKey: null,
    lastSuccessAt: null,
    lastAttemptKey: null,
    lastAttemptAt: null,
    lastSkipReason: null,
    nextRefreshAt: null,
    failureCount: 0,
    cooldownUntil: null,
    ...partial,
  };
}

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

  it('gates requests from telemetry state', () => {
    expect(shouldSkipEndpointTelemetryRequest(undefined, {now: 100})).toBe(false);
    expect(shouldSkipEndpointTelemetryRequest(telemetry({status: 'in_flight'}), {now: 100})).toBe(true);
    expect(shouldSkipEndpointTelemetryRequest(telemetry({cooldownUntil: 150}), {now: 100})).toBe(true);
    expect(shouldSkipEndpointTelemetryRequest(telemetry({nextRefreshAt: 150}), {now: 100})).toBe(true);
    expect(shouldSkipEndpointTelemetryRequest(telemetry({nextRefreshAt: 150}), {now: 100, force: true})).toBe(false);
    expect(shouldSkipEndpointTelemetryRequest(telemetry({nextRefreshAt: 90}), {now: 100})).toBe(false);
  });

  it('derives conservative next poll delay from telemetry', () => {
    expect(getEndpointTelemetryNextDelay(undefined, 1000, 100)).toBe(1000);
    expect(getEndpointTelemetryNextDelay(telemetry({nextRefreshAt: 600}), 1000, 100)).toBe(1000);
    expect(getEndpointTelemetryNextDelay(telemetry({nextRefreshAt: 2000}), 1000, 100)).toBe(1900);
  });
});
