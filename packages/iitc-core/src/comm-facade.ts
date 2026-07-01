import type {
  IitcCommMessage,
  IitcCommChannel,
  IitcCommPostData,
  IitcCommBounds,
  IitcCommChannelData,
  IitcCommWriteResult,
} from './comm';
import { genIitcCommPostData, writeIitcCommDataToHash, getIitcCommChannelMessages } from './comm';

export type IitcCommRequestDiagnostics = IitcCommWriteResult;

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
): IitcCommWriteResult {
  return writeIitcCommDataToHash(response, storageHash, getOlderMsgs, isAscendingOrder);
}

export function getIitcCommMessages(channelData: IitcCommChannelData): IitcCommMessage[] {
  return getIitcCommChannelMessages(channelData);
}
