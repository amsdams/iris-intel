import {describe, expect, it} from 'vitest';
import {createIitcCommChannelData, genIitcCommPostData, genIitcCommSendPlextPostData, getIitcCommChannelMessages, renderIitcCommMarkup, parseIitcCommResponse, parseMsgData, teamStringToId, transformIitcCommMessage, writeIitcCommDataToHash} from './comm';
import {
  applyIitcCommResponse,
  createIitcCommAuthState,
  createIitcCommErrorState,
  createIitcCommLoadingState,
  createIitcCommSuccessState,
  getIitcCommMessages,
  planIitcCommRequest,
} from './comm-facade';

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

  it('appends newer ascending continuation messages like IITC COMM storage', () => {
    const initial = writeIitcCommDataToHash({
      result: [
        ['newer', 3000, {plext: {text: 'newer', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}],
        ['middle', 2000, {plext: {text: 'middle', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}],
      ],
    }, createIitcCommChannelData());

    const newer = writeIitcCommDataToHash({
      result: [
        ['newest-a', 4000, {plext: {text: 'newest a', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST'}}],
        ['newest-b', 5000, {plext: {text: 'newest b', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST'}}],
      ],
    }, initial.channelData, false, true);

    expect(newer).toMatchObject({
      responseMessages: 2,
      parsedMessages: 2,
      addedMessages: 2,
      oldMessagesWereAdded: false,
    });
    expect(newer.channelData.oldestTimestamp).toBe(2000);
    expect(newer.channelData.oldestGUID).toBe('middle');
    expect(newer.channelData.newestTimestamp).toBe(5000);
    expect(newer.channelData.newestGUID).toBe('newest-b');
    expect(getIitcCommChannelMessages(newer.channelData).map((message) => message.guid)).toEqual(['middle', 'newer', 'newest-a', 'newest-b']);
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

describe('planIitcCommRequest', () => {
  it('produces identical payloads to genIitcCommPostData', () => {
    const bounds = {minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4};
    const initialStorage = createIitcCommChannelData();

    expect(planIitcCommRequest({ channel: 'all', bounds, storageHash: initialStorage })).toEqual(
      genIitcCommPostData({ channel: 'all', bounds, storageHash: initialStorage }),
    );

    const continuationStorage = { ...initialStorage, newestTimestamp: 2000, oldestGUID: 'older-abc' };
    expect(planIitcCommRequest({ channel: 'faction', bounds, storageHash: continuationStorage })).toEqual(
      genIitcCommPostData({ channel: 'faction', bounds, storageHash: continuationStorage }),
    );

    expect(planIitcCommRequest({ channel: 'all', bounds, storageHash: initialStorage, getOlderMsgs: true, version: 'v1' })).toEqual(
      genIitcCommPostData({ channel: 'all', bounds, storageHash: initialStorage, getOlderMsgs: true, version: 'v1' }),
    );
  });
});

describe('applyIitcCommResponse', () => {
  it('writes response data and deduplicates identically to writeIitcCommDataToHash', () => {
    const response = {
      result: [
        ['guid-1', 1000, { plext: { text: 'a', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST' } }],
        ['guid-2', 2000, { plext: { text: 'b', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST' } }],
      ],
    };

    const initial = createIitcCommChannelData();
    const facadeResult = applyIitcCommResponse(response, initial, false, false, 'all');
    const coreResult = writeIitcCommDataToHash(response, initial, false);

    expect(facadeResult.responseMessages).toBe(coreResult.responseMessages);
    expect(facadeResult.parsedMessages).toBe(coreResult.parsedMessages);
    expect(facadeResult.addedMessages).toBe(coreResult.addedMessages);
    expect(getIitcCommMessages(facadeResult.channelData)).toHaveLength(2);
    expect(facadeResult.diagnostics).toMatchObject({
      channel: 'all',
      direction: 'newer',
      isAscendingOrder: false,
      responseMessages: 2,
      parsedMessages: 2,
      addedMessages: 2,
      oldMessagesWereAdded: true,
      before: {
        oldestTimestamp: -1,
        newestTimestamp: -1,
        messageCount: 0,
      },
      after: {
        oldestTimestamp: 2000,
        oldestGUID: 'guid-2',
        newestTimestamp: 1000,
        newestGUID: 'guid-1',
        messageCount: 2,
      },
    });

    const dupResult = applyIitcCommResponse(response, facadeResult.channelData, false);
    expect(dupResult.addedMessages).toBe(0);
    expect(dupResult.diagnostics.addedMessages).toBe(0);
    expect(dupResult.diagnostics.before.messageCount).toBe(2);
    expect(dupResult.diagnostics.after.messageCount).toBe(2);
  });

  it('preserves older/newer continuation semantics', () => {
    const storage = { ...createIitcCommChannelData(), newestTimestamp: 5000, oldestGUID: 'old' };

    const newerResponse = applyIitcCommResponse({ result: [['n1', 6000, { plext: { text: 'newer', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST' } }]] }, storage, false, true, 'faction');
    expect(newerResponse.channelData.newestTimestamp).toBe(6000);
    expect(newerResponse.diagnostics).toMatchObject({
      channel: 'faction',
      direction: 'newer',
      isAscendingOrder: true,
      before: {
        newestTimestamp: 5000,
        oldestGUID: 'old',
        messageCount: 0,
      },
      after: {
        newestTimestamp: 6000,
        newestGUID: 'n1',
        messageCount: 1,
      },
    });

    const olderResponse = applyIitcCommResponse({ result: [['o1', 4000, { plext: { text: 'older', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST' } }]] }, storage, true, false, 'alerts');
    expect(olderResponse.channelData.oldestGUID).toBe('o1');
    expect(olderResponse.diagnostics).toMatchObject({
      channel: 'alerts',
      direction: 'older',
      isAscendingOrder: false,
      before: {
        newestTimestamp: 5000,
        oldestGUID: 'old',
        messageCount: 0,
      },
      after: {
        oldestTimestamp: 4000,
        oldestGUID: 'o1',
        messageCount: 1,
      },
    });
  });
});

describe('IITC COMM request state facade', () => {
  const response = {
    result: [
      ['guid-1', 1000, { plext: { text: 'a', markup: [], categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST' } }],
      ['guid-2', 2000, { plext: { text: 'b', markup: [], categories: 1, team: 'ENLIGHTENED', plextType: 'SYSTEM_BROADCAST' } }],
    ],
  };
  const bounds = {minLatE6: 1, minLngE6: 2, maxLatE6: 3, maxLngE6: 4};

  it('creates auth and loading request states from channel continuity', () => {
    const channelData = createIitcCommChannelData();

    expect(createIitcCommAuthState({
      channel: 'all',
      channelData,
      getOlderMsgs: true,
      bounds,
      error: 'missing Intel version',
    })).toEqual({
      status: 'auth',
      tab: 'all',
      messages: 0,
      requestOlder: true,
      bounds,
      error: 'missing Intel version',
    });

    const writeResult = applyIitcCommResponse(response, channelData, false, false, 'all');
    const loading = createIitcCommLoadingState({
      channel: 'faction',
      channelData: writeResult.channelData,
      bounds,
      toPreview: (message) => ({id: message.guid, text: message.text}),
    });

    expect(loading).toMatchObject({
      status: 'loading',
      tab: 'faction',
      messages: 2,
      requestOlder: false,
      bounds,
      oldestTimestamp: 2000,
      newestTimestamp: 1000,
    });
    expect(loading.recent).toEqual([
      {id: 'guid-2', text: 'b'},
      {id: 'guid-1', text: 'a'},
    ]);
  });

  it('creates success and error request states from apply results', () => {
    const writeResult = applyIitcCommResponse(response, createIitcCommChannelData(), false, false, 'all');

    expect(createIitcCommSuccessState({
      channel: 'all',
      applyResult: writeResult,
      elapsedMs: 25,
      bounds,
      toPreview: (message) => message.guid,
    })).toMatchObject({
      status: 'ready',
      tab: 'all',
      messages: 2,
      responseMessages: 2,
      addedMessages: 2,
      requestOlder: false,
      oldMessagesWereAdded: true,
      recent: ['guid-2', 'guid-1'],
      elapsedMs: 25,
      bounds,
      oldestTimestamp: 2000,
      newestTimestamp: 1000,
    });

    expect(createIitcCommErrorState({
      channel: 'alerts',
      channelData: writeResult.channelData,
      getOlderMsgs: true,
      elapsedMs: 10,
      bounds,
      error: 'getPlexts failed',
    })).toEqual({
      status: 'error',
      tab: 'alerts',
      messages: 2,
      requestOlder: true,
      elapsedMs: 10,
      bounds,
      error: 'getPlexts failed',
    });
  });
});
