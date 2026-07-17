import {describe, expect, it} from 'vitest';
import {formatCommActor, formatCommBounds, formatCommContextTitle, getCommDisplayParts, getCommTeamClass} from './comm-display';
import type {IitcIrisCommMessage} from './messages';

const message: IitcIrisCommMessage = {
  id: 'message', time: 0, text: 'text', team: 'E', type: 'PLEXT', player: 'Ada', players: ['Ada'], portals: [],
  parts: [{type: 'player', text: '@Ada'}, {type: 'text', text: ' :  hello   world '}],
};

describe('IITC IRIS COMM display', () => {
  it('removes the actor from message parts and normalizes leading text', () => {
    expect(formatCommActor(message)).toBe('Ada');
    expect(getCommDisplayParts(message)).toEqual([{type: 'text', text: 'hello world '}]);
  });

  it('formats context, bounds, and team classes', () => {
    expect(formatCommContextTitle({...message, players: ['Ada'], portals: [{address: 'Dam Square'}]})).toBe('player: Ada\nportal: Dam Square');
    expect(formatCommBounds({minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4})).toBe('1,2 to 3,4');
    expect(getCommTeamClass('E')).toBe('is-enlightened');
    expect(getCommTeamClass('N')).toBe('');
  });
});
