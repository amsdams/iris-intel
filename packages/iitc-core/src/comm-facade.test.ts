import {describe, expect, it} from 'vitest';
import {
  createIitcCommChannelData,
  genIitcCommPostData,
  writeIitcCommDataToHash,
} from './comm';
import {
  applyIitcCommResponse,
  createIitcCommAuthState,
  createIitcCommErrorState,
  createIitcCommIdleState,
  createIitcCommLoadingState,
  createIitcCommSuccessState,
  getIitcCommMessages,
  planIitcCommRequest,
} from './comm-facade';

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

    expect(createIitcCommIdleState('all')).toEqual({
      status: 'idle',
      tab: 'all',
      messages: 0,
    });

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
