import {describe, expect, it} from 'vitest';
import {parseIitcCommResponse, parseMsgData, teamStringToId} from './comm';

describe('parseMsgData', () => {
  it('parses one IITC COMM row using IITC parseMsgData semantics', () => {
    const parsed = parseMsgData(['p1', 12345, {
      plext: {
        text: 'agent: captured portal',
        markup: [
          ['SENDER', {plain: 'agent: ', team: 'RESISTANCE'}],
          ['PORTAL', {name: 'Portal', address: 'Address', latE6: 52373000, lngE6: 4892000, guid: 'portal-guid'}],
          ['AT_PLAYER', {plain: 'target'}],
        ],
        categories: 7,
        team: 'RESISTANCE',
        plextType: 'PLAYER_GENERATED',
      },
    }]);

    expect(parsed).toEqual({
      guid: 'p1',
      time: 12345,
      text: 'agent: captured portal',
      categories: 7,
      team: 'R',
      public: true,
      secure: true,
      alert: true,
      msgToPlayer: true,
      type: 'PLAYER_GENERATED',
      auto: false,
      narrowcast: false,
      player: {
        name: 'agent',
        team: 'R',
      },
      mentions: ['target'],
      markup: [
        ['SENDER', {plain: 'agent: ', team: 'RESISTANCE'}],
        ['PORTAL', {name: 'Portal', address: 'Address', latE6: 52373000, lngE6: 4892000, guid: 'portal-guid'}],
        ['AT_PLAYER', {plain: 'target'}],
      ],
    });
  });

  it('marks system narrowcast messages as auto and narrowcast', () => {
    const parsed = parseMsgData(['p2', 23456, {
      plext: {
        text: 'system message',
        markup: [],
        categories: 2,
        team: 'ENLIGHTENED',
        plextType: 'SYSTEM_NARROWCAST',
      },
    }]);

    expect(parsed).toMatchObject({
      guid: 'p2',
      team: 'E',
      public: false,
      secure: true,
      alert: false,
      msgToPlayer: false,
      auto: true,
      narrowcast: true,
    });
  });
});

describe('parseIitcCommResponse', () => {
  it('parses getPlexts result rows through parseMsgData', () => {
    const parsed = parseIitcCommResponse({
      result: [
        ['p1', 12345, {
          plext: {
            text: 'agent captured portal',
            markup: [['PLAYER', {plain: 'agent', team: 'RESISTANCE'}]],
            categories: 1,
            team: 'RESISTANCE',
            plextType: 'SYSTEM_BROADCAST',
          },
        }],
      ],
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      guid: 'p1',
      type: 'SYSTEM_BROADCAST',
      player: {
        name: 'agent',
        team: 'R',
      },
    });
  });
});

describe('teamStringToId', () => {
  it('normalizes Intel team strings to IITC team ids', () => {
    expect(teamStringToId('RESISTANCE')).toBe('R');
    expect(teamStringToId('ENLIGHTENED')).toBe('E');
    expect(teamStringToId('MACHINA')).toBe('M');
    expect(teamStringToId('UNKNOWN')).toBe('N');
  });
});
