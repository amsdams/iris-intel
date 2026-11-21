import {getIitcCommResponseRows, parseMsgData, type IitcCommMessage} from './comm-protocol';

export interface IitcCommChannelData {
  data: Record<string, IitcCommMessage>;
  guids: string[];
  oldestTimestamp: number;
  oldestGUID?: string;
  newestTimestamp: number;
  newestGUID?: string;
}

export interface IitcCommWriteResult {
  channelData: IitcCommChannelData;
  responseMessages: number;
  parsedMessages: number;
  addedMessages: number;
  oldMessagesWereAdded: boolean;
}

export function createIitcCommChannelData(): IitcCommChannelData {
  return {
    data: {},
    guids: [],
    oldestTimestamp: -1,
    newestTimestamp: -1,
  };
}

function updateOldNewHash(messages: IitcCommMessage[], storageHash: IitcCommChannelData, isOlderMsgs: boolean, isAscendingOrder: boolean): IitcCommChannelData {
  if (messages.length === 0) return storageHash;

  let first = messages[0];
  let last = messages[messages.length - 1];
  if (isAscendingOrder) {
    const temp = first;
    first = last;
    last = temp;
  }

  const next: IitcCommChannelData = {...storageHash};
  if (next.oldestTimestamp === -1 || next.oldestTimestamp >= last.time) {
    if (isOlderMsgs || next.oldestTimestamp !== last.time) {
      next.oldestTimestamp = last.time;
      next.oldestGUID = last.guid;
    }
  }
  if (next.newestTimestamp === -1 || next.newestTimestamp <= first.time) {
    if (!isOlderMsgs || next.newestTimestamp !== first.time) {
      next.newestTimestamp = first.time;
      next.newestGUID = first.guid;
    }
  }

  return next;
}

export function writeIitcCommDataToHash(response: unknown, storageHash: IitcCommChannelData, isOlderMsgs = false, isAscendingOrder = false): IitcCommWriteResult {
  const rows = getIitcCommResponseRows(response);
  const messages = rows
    .map(parseMsgData)
    .filter((message): message is IitcCommMessage => message !== null);
  const oldOldestGuid = storageHash.oldestGUID;
  const next = updateOldNewHash(messages, {
    ...storageHash,
    data: {...storageHash.data},
    guids: [...storageHash.guids],
  }, isOlderMsgs, isAscendingOrder);

  let addedMessages = 0;
  for (const message of messages) {
    if (next.data[message.guid]) continue;
    next.data[message.guid] = message;
    if (isAscendingOrder) next.guids.push(message.guid);
    else next.guids.unshift(message.guid);
    addedMessages += 1;
  }

  return {
    channelData: next,
    responseMessages: rows.length,
    parsedMessages: messages.length,
    addedMessages,
    oldMessagesWereAdded: oldOldestGuid !== next.oldestGUID,
  };
}

export function getIitcCommChannelMessages(channelData: IitcCommChannelData): IitcCommMessage[] {
  return channelData.guids
    .map((guid) => channelData.data[guid])
    .filter((message): message is IitcCommMessage => message !== undefined);
}
