import {describe, expect, it} from 'vitest';
import {getMessageType, isIrisDataMessage, isRuntimeRecord, numberOrNull, stringOrNull} from './runtime-messages';

describe('runtime message helpers', () => {
  it('narrows records and message types', () => {
    expect(isRuntimeRecord({type: 'IRIS_DATA'})).toBe(true);
    expect(isRuntimeRecord(null)).toBe(false);
    expect(getMessageType({type: 'IRIS_DATA'})).toBe('IRIS_DATA');
    expect(getMessageType({type: 42})).toBe(null);
  });

  it('parses primitive fields defensively', () => {
    expect(stringOrNull('abc')).toBe('abc');
    expect(stringOrNull(1)).toBe(null);
    expect(numberOrNull(12)).toBe(12);
    expect(numberOrNull(Number.NaN)).toBe(null);
  });

  it('recognizes IRIS data messages', () => {
    expect(isIrisDataMessage({type: 'IRIS_DATA', url: '/r/getEntities', data: {}})).toBe(true);
    expect(isIrisDataMessage({type: 'IRIS_DATA', data: {}})).toBe(false);
  });
});
