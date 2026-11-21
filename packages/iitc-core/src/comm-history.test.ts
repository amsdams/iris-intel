import {describe, expect, it} from 'vitest';
import {
  createIitcCommChannelData,
  getIitcCommChannelMessages,
  writeIitcCommDataToHash,
} from './comm';

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
