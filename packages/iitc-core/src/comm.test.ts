import {describe, expect, it} from 'vitest';
import {createIitcCommChannelData, genIitcCommPostData, genIitcCommSendPlextPostData, getIitcCommChannelMessages, renderIitcCommMarkup, parseIitcCommResponse, parseMsgData, teamStringToId, transformIitcCommMessage, writeIitcCommDataToHash} from './comm';

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

describe('writeIitcCommDataToHash', () => {
  it('stores parsed messages by guid and tracks newest/oldest continuity', () => {
    const response = {
      result: [
        ['newer', 2000, {
          plext: {
            text: 'newer',
            markup: [['PLAYER', {plain: 'newer-agent', team: 'RESISTANCE'}]],
            categories: 1,
            team: 'RESISTANCE',
            plextType: 'SYSTEM_BROADCAST',
          },
        }],
        ['older', 1000, {
          plext: {
            text: 'older',
            markup: [['PLAYER', {plain: 'older-agent', team: 'ENLIGHTENED'}]],
            categories: 1,
            team: 'ENLIGHTENED',
            plextType: 'SYSTEM_BROADCAST',
          },
        }],
      ],
    };

    const written = writeIitcCommDataToHash(response, createIitcCommChannelData());

    expect(written).toMatchObject({
      responseMessages: 2,
      parsedMessages: 2,
      addedMessages: 2,
      oldMessagesWereAdded: true,
    });
    expect(written.channelData.newestTimestamp).toBe(2000);
    expect(written.channelData.newestGUID).toBe('newer');
    expect(written.channelData.oldestTimestamp).toBe(1000);
    expect(written.channelData.oldestGUID).toBe('older');
    expect(getIitcCommChannelMessages(written.channelData).map((message) => message.guid)).toEqual(['older', 'newer']);
  });

  it('deduplicates repeated message guids', () => {
    const response = {
      result: [
        ['same', 1000, {
          plext: {
            text: 'same',
            markup: [['PLAYER', {plain: 'agent', team: 'RESISTANCE'}]],
            categories: 1,
            team: 'RESISTANCE',
            plextType: 'SYSTEM_BROADCAST',
          },
        }],
      ],
    };

    const first = writeIitcCommDataToHash(response, createIitcCommChannelData());
    const second = writeIitcCommDataToHash(response, first.channelData);

    expect(second.addedMessages).toBe(0);
    expect(getIitcCommChannelMessages(second.channelData)).toHaveLength(1);
  });

  it('prepends older continuation messages and updates oldest continuity', () => {
    const initial = writeIitcCommDataToHash({
      result: [
        ['newer', 3000, {plext: {text: 'newer', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}],
        ['middle', 2000, {plext: {text: 'middle', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}],
      ],
    }, createIitcCommChannelData());

    const older = writeIitcCommDataToHash({
      result: [
        ['older-a', 1000, {plext: {text: 'older a', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST'}}],
        ['older-b', 500, {plext: {text: 'older b', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST'}}],
      ],
    }, initial.channelData, true);

    expect(older).toMatchObject({
      responseMessages: 2,
      parsedMessages: 2,
      addedMessages: 2,
      oldMessagesWereAdded: true,
    });
    expect(older.channelData.oldestTimestamp).toBe(500);
    expect(older.channelData.oldestGUID).toBe('older-b');
    expect(older.channelData.newestTimestamp).toBe(3000);
    expect(older.channelData.newestGUID).toBe('newer');
    expect(getIitcCommChannelMessages(older.channelData).map((message) => message.guid)).toEqual(['older-b', 'older-a', 'middle', 'newer']);
  });
});

describe('genIitcCommPostData', () => {
  it('creates initial and continuation request payloads using IITC channel semantics', () => {
    const bounds = {minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4};
    const initial = genIitcCommPostData({
      channel: 'all',
      bounds,
      storageHash: createIitcCommChannelData(),
      version: 'v-test',
    });

    expect(initial).toEqual({
      ...bounds,
      minTimestampMs: -1,
      maxTimestampMs: -1,
      tab: 'all',
      v: 'v-test',
    });

    const storageHash = {
      ...createIitcCommChannelData(),
      newestTimestamp: 2000,
      newestGUID: 'newer',
      oldestTimestamp: 1000,
      oldestGUID: 'older',
    };
    expect(genIitcCommPostData({channel: 'faction', bounds, storageHash})).toEqual({
      ...bounds,
      minTimestampMs: 2000,
      maxTimestampMs: -1,
      tab: 'faction',
      plextContinuationGuid: 'newer',
      ascendingTimestampOrder: true,
    });
    expect(genIitcCommPostData({channel: 'alerts', bounds, storageHash, getOlderMsgs: true})).toEqual({
      ...bounds,
      minTimestampMs: -1,
      maxTimestampMs: 1000,
      tab: 'alerts',
      plextContinuationGuid: 'older',
    });
  });
});

describe('renderIitcCommMarkup', () => {
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

describe('genIitcCommSendPlextPostData', () => {
  it('creates sendPlext payloads for all and faction but not alerts', () => {
    expect(genIitcCommSendPlextPostData({
      channel: 'all',
      message: ' hello ',
      latE6: 123,
      lngE6: 456,
    })).toEqual({
      message: 'hello',
      latE6: 123,
      lngE6: 456,
      tab: 'all',
    });
    expect(genIitcCommSendPlextPostData({
      channel: 'alerts',
      message: 'hello',
      latE6: 123,
      lngE6: 456,
    })).toBeNull();
    expect(genIitcCommSendPlextPostData({
      channel: 'faction',
      message: '   ',
      latE6: 123,
      lngE6: 456,
    })).toBeNull();
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
