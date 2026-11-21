import type {IitcCommBounds} from './comm-protocol';

export {
  type IitcTeamId,
  type IitcCommChannel,
  type IitcCommChannelDescription,
  type IitcCommMarkupValue,
  type IitcCommPlayer,
  type IitcCommMessage,
  type IitcCommBounds,
  type IitcCommPostData,
  type IitcCommSendPlextPostData,
  type RawCommData,
  type IitcCommResponse,
  teamStringToId,
  isIitcCommTimestamp,
  parseMsgData,
  parseIitcCommResponse,
  validateIitcCommResponse,
  validateIitcCommSendResponse,
  genIitcCommPostData,
  genIitcCommSendPlextPostData,
} from './comm-protocol';

export * from './comm-history';
export * from './comm-markup';

export function hasIitcCommBoundsChanged(previous: IitcCommBounds, next: IitcCommBounds): boolean {
  const contains = (outer: IitcCommBounds, inner: IitcCommBounds): boolean => {
    const latPad = (outer.maxLatE6 - outer.minLatE6) * 0.1;
    const lngPad = (outer.maxLngE6 - outer.minLngE6) * 0.1;
    return outer.minLatE6 - latPad <= inner.minLatE6 && outer.maxLatE6 + latPad >= inner.maxLatE6 &&
      outer.minLngE6 - lngPad <= inner.minLngE6 && outer.maxLngE6 + lngPad >= inner.maxLngE6;
  };
  return !contains(previous, next) || !contains(next, previous);
}

/** IITC request_handling.js: REFRESH plus the zoom-level adjustment. */
export function getIitcCommRefreshDelayMs(zoom: number): number {
  return (30 + Math.max(0, 5 * (18 - zoom))) * 1000;
}
