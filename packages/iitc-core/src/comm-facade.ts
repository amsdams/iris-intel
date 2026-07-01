import type {
  IitcCommMessage,
  IitcCommChannel,
  IitcCommPostData,
  IitcCommBounds,
  IitcCommChannelData,
  IitcCommWriteResult,
} from './comm';
import { genIitcCommPostData, writeIitcCommDataToHash, getIitcCommChannelMessages } from './comm';

export type IitcCommRequestDirection = 'newer' | 'older';

export interface IitcCommContinuitySnapshot {
  oldestTimestamp: number;
  oldestGUID?: string;
  newestTimestamp: number;
  newestGUID?: string;
  messageCount: number;
}

export interface IitcCommWriteDiagnostics {
  channel?: IitcCommChannel;
  direction: IitcCommRequestDirection;
  isAscendingOrder: boolean;
  before: IitcCommContinuitySnapshot;
  after: IitcCommContinuitySnapshot;
  responseMessages: number;
  parsedMessages: number;
  addedMessages: number;
  oldMessagesWereAdded: boolean;
}

export interface IitcCommApplyResult extends IitcCommWriteResult {
  diagnostics: IitcCommWriteDiagnostics;
}

export type IitcCommRequestDiagnostics = IitcCommWriteDiagnostics;

function getIitcCommContinuitySnapshot(channelData: IitcCommChannelData): IitcCommContinuitySnapshot {
  return {
    oldestTimestamp: channelData.oldestTimestamp,
    oldestGUID: channelData.oldestGUID,
    newestTimestamp: channelData.newestTimestamp,
    newestGUID: channelData.newestGUID,
    messageCount: channelData.guids.length,
  };
}

export function planIitcCommRequest(options: {
  channel: IitcCommChannel;
  bounds: IitcCommBounds;
  storageHash: IitcCommChannelData;
  getOlderMsgs?: boolean;
  version?: string;
}): IitcCommPostData {
  return genIitcCommPostData(options);
}

export function applyIitcCommResponse(
  response: unknown,
  storageHash: IitcCommChannelData,
  getOlderMsgs: boolean,
  isAscendingOrder?: boolean,
  channel?: IitcCommChannel,
): IitcCommApplyResult {
  const before = getIitcCommContinuitySnapshot(storageHash);
  const writeResult = writeIitcCommDataToHash(response, storageHash, getOlderMsgs, isAscendingOrder);
  const after = getIitcCommContinuitySnapshot(writeResult.channelData);

  return {
    ...writeResult,
    diagnostics: {
      channel,
      direction: getOlderMsgs ? 'older' : 'newer',
      isAscendingOrder: isAscendingOrder === true,
      before,
      after,
      responseMessages: writeResult.responseMessages,
      parsedMessages: writeResult.parsedMessages,
      addedMessages: writeResult.addedMessages,
      oldMessagesWereAdded: writeResult.oldMessagesWereAdded,
    },
  };
}

export function getIitcCommMessages(channelData: IitcCommChannelData): IitcCommMessage[] {
  return getIitcCommChannelMessages(channelData);
}
