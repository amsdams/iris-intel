import {describe, expect, it} from 'vitest';
import {
  renderIitcCommMarkup,
  parseMsgData,
  transformIitcCommMessage,
} from './comm';

describe('renderIitcCommMarkup', () => {
  it('uses IITC Machina coloring for faction-tagged neutral/unknown TEXT without changing ordinary text or player teams', () => {
    for (const [team, expected] of [[undefined, undefined], ['', undefined], ['MACHINA', 'M'], ['M', 'M'],
      ['NEUTRAL', 'M'], ['__MACHINA__', 'M'], ['RESISTANCE', 'R'], ['ENLIGHTENED', 'E']] as const) {
      const parsed = parseMsgData(['machina', 12345, {plext: {
        text: '__MACHINA__ destroyed a portal', categories: 1, team: 'NEUTRAL', plextType: 'SYSTEM_BROADCAST',
        markup: [['TEXT', {plain: '__MACHINA__', team}], ['TEXT', {plain: ' destroyed '}],
          ['PLAYER', {plain: 'NeutralPlayer', team: 'NEUTRAL'}]],
      }}]);
      if (!parsed) throw new Error('expected parsed Machina message');
      expect(renderIitcCommMarkup(parsed)).toEqual([
        {type: 'text', text: '__MACHINA__', team: expected},
        {type: 'text', text: ' destroyed ', team: undefined},
        {type: 'player', text: 'NeutralPlayer', team: 'N'},
      ]);
      expect(parsed.team).toBe('N');
      expect(parsed.markup[0][1].team).toBe(team);
    }
  });

  it('skips duplicated generated-message player prefixes like IITC transformMessage', () => {
    const parsed = parseMsgData(['p1', 12345, {
      plext: {
        text: 'Agent agent deployed a Resonator',
        markup: [
          ['TEXT', {plain: 'Agent '}],
          ['PLAYER', {plain: 'agent', team: 'RESISTANCE'}],
          ['TEXT', {plain: ' deployed a Resonator'}],
        ],
        categories: 1,
        team: 'RESISTANCE',
        plextType: 'SYSTEM_BROADCAST',
      },
    }]);

    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error('expected parsed COMM message');
    expect(transformIitcCommMessage(parsed)).toEqual([
      ['TEXT', {plain: ' deployed a Resonator'}],
    ]);
    expect(renderIitcCommMarkup(parsed)).toEqual([
      {type: 'text', text: ' deployed a Resonator', team: undefined},
    ]);
  });

  it('renders portal and mentioned player markup as structured display parts', () => {
    const parsed = parseMsgData(['p2', 12345, {
      plext: {
        text: 'agent: meet at portal @friend',
        markup: [
          ['SENDER', {plain: 'agent: ', team: 'RESISTANCE'}],
          ['TEXT', {plain: 'meet at '}],
          ['PORTAL', {name: 'US Post Office', address: 'Main St, City', latE6: 1, lngE6: 2, guid: 'portal-guid'}],
          ['TEXT', {plain: ' '}],
          ['AT_PLAYER', {plain: '@friend', team: 'ENLIGHTENED'}],
        ],
        categories: 1,
        team: 'RESISTANCE',
        plextType: 'PLAYER_GENERATED',
      },
    }]);

    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error('expected parsed COMM message');
    expect(renderIitcCommMarkup(parsed)).toEqual([
      {type: 'text', text: 'meet at ', team: undefined},
      {
        type: 'portal',
        text: 'USPS: Main St',
        portal: {name: 'US Post Office', address: 'Main St, City', latE6: 1, lngE6: 2, guid: 'portal-guid'},
      },
      {type: 'text', text: ' ', team: undefined},
      {type: 'player', text: 'friend', team: 'E', at: true},
    ]);
  });
});
