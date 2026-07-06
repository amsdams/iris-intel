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

export interface IitcCommRequestState<TPreview = IitcCommMessage> {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  tab: IitcCommChannel;
  messages: number;
  responseMessages?: number;
  addedMessages?: number;
  requestOlder?: boolean;
  oldMessagesWereAdded?: boolean;
  recent?: TPreview[];
  elapsedMs?: number;
  error?: string;
  oldestTimestamp?: number;
  newestTimestamp?: number;
  bounds?: IitcCommBounds;
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

export function createIitcCommAuthState(options: {
  channel: IitcCommChannel;
  channelData: IitcCommChannelData;
  getOlderMsgs?: boolean;
  bounds?: IitcCommBounds;
  error: string;
}): IitcCommRequestState<never> {
  return {
    status: 'auth',
    tab: options.channel,
    messages: getIitcCommChannelMessages(options.channelData).length,
    requestOlder: options.getOlderMsgs === true,
    bounds: options.bounds,
    error: options.error,
  };
}

export function createIitcCommLoadingState<TPreview = IitcCommMessage>(options: {
  channel: IitcCommChannel;
  channelData: IitcCommChannelData;
  getOlderMsgs?: boolean;
  bounds?: IitcCommBounds;
  toPreview?: (message: IitcCommMessage) => TPreview;
}): IitcCommRequestState<TPreview> {
  const messages = getIitcCommChannelMessages(options.channelData);
  return {
    status: 'loading',
    tab: options.channel,
    messages: messages.length,
    requestOlder: options.getOlderMsgs === true,
    bounds: options.bounds,
    recent: options.toPreview ? messages.map(options.toPreview) : messages as TPreview[],
    oldestTimestamp: options.channelData.oldestTimestamp,
    newestTimestamp: options.channelData.newestTimestamp,
  };
}

export function createIitcCommSuccessState<TPreview = IitcCommMessage>(options: {
  channel: IitcCommChannel;
  applyResult: IitcCommApplyResult;
  getOlderMsgs?: boolean;
  elapsedMs: number;
  bounds?: IitcCommBounds;
  toPreview?: (message: IitcCommMessage) => TPreview;
}): IitcCommRequestState<TPreview> {
  const messages = getIitcCommChannelMessages(options.applyResult.channelData);
  return {
    status: messages.length > 0 ? 'ready' : 'empty',
    tab: options.channel,
    messages: messages.length,
    responseMessages: options.applyResult.responseMessages,
    addedMessages: options.applyResult.addedMessages,
    requestOlder: options.getOlderMsgs === true,
    oldMessagesWereAdded: options.applyResult.oldMessagesWereAdded,
    recent: options.toPreview ? messages.map(options.toPreview) : messages as TPreview[],
    elapsedMs: options.elapsedMs,
    bounds: options.bounds,
    oldestTimestamp: options.applyResult.channelData.oldestTimestamp,
    newestTimestamp: options.applyResult.channelData.newestTimestamp,
  };
}

export function createIitcCommErrorState(options: {
  channel: IitcCommChannel;
  channelData: IitcCommChannelData;
  getOlderMsgs?: boolean;
  elapsedMs: number;
  bounds?: IitcCommBounds;
  error: string;
  status?: 'error' | 'auth';
}): IitcCommRequestState<never> {
  return {
    status: options.status ?? 'error',
    tab: options.channel,
    messages: getIitcCommChannelMessages(options.channelData).length,
    requestOlder: options.getOlderMsgs === true,
    elapsedMs: options.elapsedMs,
    bounds: options.bounds,
    error: options.error,
  };
}
