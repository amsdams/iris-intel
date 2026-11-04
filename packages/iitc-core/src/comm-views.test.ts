import {describe, expect, it} from 'vitest';
import {completeIitcCommNickname, DEFAULT_IITC_COMM_FILTERS, getIitcCommAction, matchesIitcCommFilters,
  matchesIitcCommPortal, normalizeIitcCommFilters, splitIitcCommTextLinks, type IitcCommViewMessage} from './comm-views';
import {isIitcCommTimestamp, parseMsgData, validateIitcCommResponse, validateIitcCommSendResponse} from './comm';

const message: IitcCommViewMessage = {auto: true, text: 'Agent captured Fountain', team: 'R', player: 'Agent',
  players: ['Agent'], parts: [{type: 'text', text: ' captured '}, {type: 'portal', text: 'Fountain'}],
  portals: [{guid: 'p', name: 'Fountain', address: 'Main street', latE6: 52, lngE6: 4}]};

describe('COMM display views', () => {
  it('rejects malformed payloads while accepting a legitimate empty response', () => {
    for (const value of [null, {}, {result: false}, {result: [[]]}]) expect(() => validateIitcCommResponse(value)).toThrow('malformed');
    expect(() => validateIitcCommResponse({result: []})).not.toThrow();
  });
  it('rejects invalid timestamps before messages can change cursors, including finite Date overflow', () => {
    for (const time of [NaN, Infinity, -Infinity, 8_640_000_000_000_001, -8_640_000_000_000_001, null, '2000']) {
      const row = ['bad', time, {plext: {text: 'bad', markup: []}}];
      expect(isIitcCommTimestamp(time)).toBe(false);
      expect(parseMsgData(row)).toBeNull();
      expect(() => validateIitcCommResponse({result: [row]})).toThrow('malformed');
    }
    for (const time of [0, 2000, -8_640_000_000_000_000, 8_640_000_000_000_000]) expect(isIitcCommTimestamp(time)).toBe(true);
  });
  it('requires explicit positive send acknowledgments and gives errors precedence', () => {
    for (const result of [true, 'success', 'SUCCESS']) expect(() => validateIitcCommSendResponse({result, error: null})).not.toThrow();
    for (const response of [null, {}, [], {result: false}, {result: null}, {result: []}, {result: 'unknown'}]) {
      expect(() => validateIitcCommSendResponse(response)).toThrow('Delivery was not confirmed');
    }
    for (const error of ['denied', {message: 'denied'}]) expect(() => validateIitcCommSendResponse({result: true, error})).toThrow('denied');
    expect(() => validateIitcCommSendResponse({error: true})).toThrow('rejected');
  });
  it('classifies action text without mistaking chat or player names for system actions', () => {
    expect(getIitcCommAction({...message, player: 'Destroyed'})).toBe('capture');
    expect(getIitcCommAction({...message, auto: false})).toBe('chat');
    for (const [text, action] of [[' deployed ', 'deploy'], [' destroyed a Control Field ', 'destroy'],
      [' created a Control Field ', 'field'], [' linked ', 'link'], [' unusual activity ', 'other']]) {
      expect(getIitcCommAction({...message, parts: [{type: 'text', text}]})).toBe(action);
    }
  });
  it('combines filters case-insensitively and never changes source messages', () => {
    const before = JSON.stringify(message);
    expect(matchesIitcCommFilters(message, {...DEFAULT_IITC_COMM_FILTERS, kind: 'activity', action: 'capture',
      team: 'R', query: 'main STREET', portal: 'fount', agent: 'agen'})).toBe(true);
    for (const filter of [{kind: 'chat'}, {team: 'E'}, {query: 'missing'}, {agent: 'someone'}, {action: 'link'}]) {
      expect(matchesIitcCommFilters(message, normalizeIitcCommFilters(filter))).toBe(false);
    }
    expect(JSON.stringify(message)).toBe(before);
    expect(normalizeIitcCommFilters({kind: 'broken', query: false})).toEqual(DEFAULT_IITC_COMM_FILTERS);
  });
  it('matches portal identity first, then coordinates when COMM has no GUID', () => {
    expect(matchesIitcCommPortal(message, {guid: 'p', latE6: 52, lngE6: 4})).toBe(true);
    expect(matchesIitcCommPortal(message, {guid: 'other', latE6: 52, lngE6: 4})).toBe(false);
    expect(matchesIitcCommPortal({...message, portals: [{latE6: 52, lngE6: 4}]}, {guid: 'p', latE6: 52, lngE6: 4})).toBe(true);
    expect(matchesIitcCommPortal(message, {latE6: 52, lngE6: 5})).toBe(false);
  });
  it('completes one visible name at the cursor without hijacking ambiguous or shifted Tab', () => {
    expect(completeIitcCommNickname('hello @Ag tail', 9, ['Agent'])).toEqual({text: 'hello @Agent  tail', cursor: 13});
    expect(completeIitcCommNickname('Ag', 2, ['Agent', 'Agnes'])).toBeUndefined();
    expect(completeIitcCommNickname('hello ', 6, ['Agent'])).toBeUndefined();
  });
  it('links only HTTP(S) text, retains punctuation and never treats markup as HTML', () => {
    const text = '<b>https://example.com/path.</b> javascript:alert(1) https://other.test/?x=1&y=2!';
    const parts = splitIitcCommTextLinks(text);
    expect(parts.map(part => part.text).join('')).toBe(text);
    expect(parts.filter(part => part.href).map(part => part.href)).toEqual(['https://example.com/path', 'https://other.test/?x=1&y=2']);
    expect(splitIitcCommTextLinks('javascript:alert(1)').some(part => part.href)).toBe(false);
  });
});
