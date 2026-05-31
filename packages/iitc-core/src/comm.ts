export type IitcTeamId = 'E' | 'R' | 'N' | 'M';
export type IitcCommChannel = 'all' | 'faction' | 'alerts';

export interface IitcCommChannelDescription {
  id: IitcCommChannel;
  name: string;
  localBounds: boolean;
  inputPrompt: string;
  inputClass: string;
}

export interface IitcCommMarkupValue {
  plain?: string;
  team?: string;
  name?: string;
  address?: string;
  latE6?: number;
  lngE6?: number;
  guid?: string;
}

export interface IitcCommPlayer {
  name: string;
  team: IitcTeamId;
}

export interface IitcCommMessage {
  guid: string;
  time: number;
  public: boolean;
  secure: boolean;
  alert: boolean;
  msgToPlayer: boolean;
  type: string;
  narrowcast: boolean;
  auto: boolean;
  team: IitcTeamId;
  player: IitcCommPlayer;
  text: string;
  categories: number;
  markup: [string, IitcCommMarkupValue][];
  mentions: string[];
}

export interface IitcCommRenderedPart {
  type: 'text' | 'portal' | 'faction' | 'player' | 'unknown';
  text: string;
  team?: IitcTeamId;
  at?: boolean;
  sender?: boolean;
  portal?: {
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
    guid?: string;
  };
}

export interface IitcCommBounds {
  minLatE6: number;
  minLngE6: number;
  maxLatE6: number;
  maxLngE6: number;
}

export interface IitcCommChannelData {
  data: Record<string, IitcCommMessage>;
  guids: string[];
  oldestTimestamp: number;
  oldestGUID?: string;
  newestTimestamp: number;
  newestGUID?: string;
}

export interface IitcCommPostData extends IitcCommBounds {
  minTimestampMs: number;
  maxTimestampMs: number;
  tab: IitcCommChannel;
  v?: string;
  plextContinuationGuid?: string;
  ascendingTimestampOrder?: true;
}

export interface IitcCommSendPlextPostData {
  message: string;
  latE6: number;
  lngE6: number;
  tab: Exclude<IitcCommChannel, 'alerts'>;
}

export interface IitcCommWriteResult {
  channelData: IitcCommChannelData;
  responseMessages: number;
  parsedMessages: number;
  addedMessages: number;
  oldMessagesWereAdded: boolean;
}

interface RawCommMarkup {
  0: string;
  1: IitcCommMarkupValue;
}

interface RawCommResult {
  plext?: {
    text?: unknown;
    markup?: unknown;
    categories?: unknown;
    team?: unknown;
    plextType?: unknown;
  };
}

export type RawCommData = [string, number, RawCommResult];

export interface IitcCommResponse {
  result?: RawCommData[];
  error?: string;
}

const COMM_PUBLIC = 1;
const COMM_SECURE = 2;
const COMM_ALERT = 4;

export const IITC_COMM_CHANNELS: IitcCommChannelDescription[] = [
  {id: 'all', name: 'All', localBounds: true, inputPrompt: 'broadcast:', inputClass: 'public'},
  {id: 'faction', name: 'Faction', localBounds: true, inputPrompt: 'tell faction:', inputClass: 'faction'},
  {id: 'alerts', name: 'Alerts', localBounds: false, inputPrompt: 'tell Jarvis:', inputClass: 'alerts'},
];

function isRawMarkup(value: unknown): value is RawCommMarkup {
  return Array.isArray(value) && typeof value[0] === 'string' && !!value[1] && typeof value[1] === 'object';
}

export function teamStringToId(team: unknown): IitcTeamId {
  if (team === 'E' || team === 'ENLIGHTENED' || team === 'ALIENS') return 'E';
  if (team === 'R' || team === 'RESISTANCE' || team === 'RESISTANCE_TEAM') return 'R';
  if (team === 'M' || team === 'MACHINA') return 'M';
  return 'N';
}

function normalizeMarkup(rawMarkup: unknown): [string, IitcCommMarkupValue][] {
  return (Array.isArray(rawMarkup) ? rawMarkup : [])
    .filter(isRawMarkup)
    .map((markupEntry) => [markupEntry[0], {
      plain: markupEntry[1].plain,
      team: markupEntry[1].team,
      name: markupEntry[1].name,
      address: markupEntry[1].address,
      latE6: markupEntry[1].latE6,
      lngE6: markupEntry[1].lngE6,
      guid: markupEntry[1].guid,
    }]);
}

function trimSenderSuffix(name: string): string {
  return name.replace(/: $/, '');
}

function cloneMarkup(markup: [string, IitcCommMarkupValue][]): [string, IitcCommMarkupValue][] {
  return markup.map(([type, value]) => [type, {...value}]);
}

export function parseMsgData(data: unknown): IitcCommMessage | null {
  if (!Array.isArray(data)) return null;
  const [guid, time, rawData] = data as RawCommData;
  const plext = rawData?.plext;
  if (typeof guid !== 'string' || typeof time !== 'number' || !plext) return null;

  const categories = typeof plext.categories === 'number' ? plext.categories : 0;
  const isPublic = (categories & COMM_PUBLIC) === COMM_PUBLIC;
  const isSecure = (categories & COMM_SECURE) === COMM_SECURE;
  const msgAlert = (categories & COMM_ALERT) === COMM_ALERT;
  const type = typeof plext.plextType === 'string' ? plext.plextType : '';
  const team = teamStringToId(plext.team);
  const markup = normalizeMarkup(plext.markup);
  const player: IitcCommPlayer = {
    name: '',
    team,
  };

  for (const [markupType, value] of markup) {
    switch (markupType) {
      case 'SENDER':
        player.name = trimSenderSuffix(value.plain ?? '');
        break;
      case 'PLAYER':
        player.name = value.plain ?? '';
        player.team = teamStringToId(value.team);
        break;
      default:
        break;
    }
  }

  return {
    guid,
    time,
    public: isPublic,
    secure: isSecure,
    alert: msgAlert,
    msgToPlayer: msgAlert && (isPublic || isSecure),
    type,
    narrowcast: type === 'SYSTEM_NARROWCAST',
    auto: type !== 'PLAYER_GENERATED',
    team,
    player,
    text: typeof plext.text === 'string' ? plext.text : '',
    categories,
    markup,
    mentions: markup
      .filter(([markupType]) => markupType === 'AT_PLAYER')
      .map(([, value]) => value.plain || value.name || '')
      .filter((value) => value.length > 0),
  };
}

export function parseIitcCommResponse(response: unknown): IitcCommMessage[] {
  if (!response || typeof response !== 'object') return [];
  const result = (response as IitcCommResponse).result;
  if (!Array.isArray(result)) return [];

  return result
    .map(parseMsgData)
    .filter((message): message is IitcCommMessage => message !== null);
}

export function getIitcChatPortalName(markup: IitcCommMarkupValue): string {
  if (markup.name === 'US Post Office' && typeof markup.address === 'string') {
    return `USPS: ${markup.address.split(',')[0]}`;
  }
  return markup.name || markup.address || 'portal';
}

export function transformIitcCommMessage(message: IitcCommMessage): [string, IitcCommMarkupValue][] {
  let markup = cloneMarkup(message.markup);

  if (
    markup.length > 4 &&
    markup[3][0] === 'FACTION' &&
    markup[4][0] === 'TEXT' &&
    (markup[4][1].plain === ' Link ' || markup[4][1].plain === ' Control Field @')
  ) {
    markup[4][1].team = markup[3][1].team;
    markup.splice(3, 1);
  }

  if (markup.length > 1 && markup[0][0] === 'TEXT' && markup[0][1].plain === 'Agent ' && markup[1][0] === 'PLAYER') {
    markup = markup.slice(2);
  }

  if (
    markup.length > 2 &&
    markup[0][0] === 'FACTION' &&
    markup[1][0] === 'TEXT' &&
    markup[1][1].plain === ' agent ' &&
    markup[2][0] === 'PLAYER'
  ) {
    markup = markup.slice(3);
  }

  return markup;
}

function renderMarkupEntity(type: string, value: IitcCommMarkupValue): IitcCommRenderedPart {
  switch (type) {
    case 'TEXT':
      return {type: 'text', text: value.plain ?? '', team: value.team ? teamStringToId(value.team) : undefined};
    case 'PORTAL':
      return {
        type: 'portal',
        text: getIitcChatPortalName(value),
        portal: {
          name: value.name,
          address: value.address,
          latE6: value.latE6,
          lngE6: value.lngE6,
          guid: value.guid,
        },
      };
    case 'FACTION':
      return {type: 'faction', text: teamStringToId(value.team), team: teamStringToId(value.team)};
    case 'SENDER':
      return {type: 'player', text: trimSenderSuffix(value.plain ?? value.name ?? ''), team: teamStringToId(value.team), sender: true};
    case 'PLAYER':
      return {type: 'player', text: value.plain ?? value.name ?? '', team: teamStringToId(value.team)};
    case 'AT_PLAYER':
      return {type: 'player', text: (value.plain ?? value.name ?? '').replace(/^@/, ''), team: teamStringToId(value.team), at: true};
    default:
      return {type: 'unknown', text: `${type}:<${value.plain ?? ''}>`};
  }
}

export function renderIitcCommMarkup(message: IitcCommMessage): IitcCommRenderedPart[] {
  const parts: IitcCommRenderedPart[] = [];
  for (const [index, [type, value]] of transformIitcCommMessage(message).entries()) {
    switch (type) {
      case 'SENDER':
      case 'SECURE':
        break;
      case 'PLAYER':
        if (index > 0) parts.push(renderMarkupEntity(type, value));
        break;
      default:
        parts.push(renderMarkupEntity(type, value));
        break;
    }
  }
  return parts;
}

export function createIitcCommChannelData(): IitcCommChannelData {
  return {
    data: {},
    guids: [],
    oldestTimestamp: -1,
    newestTimestamp: -1,
  };
}

function getIitcCommResponseRows(response: unknown): RawCommData[] {
  if (!response || typeof response !== 'object') return [];
  const result = (response as IitcCommResponse).result;
  return Array.isArray(result) ? result : [];
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

export function genIitcCommPostData(options: {
  channel: IitcCommChannel;
  bounds: IitcCommBounds;
  storageHash: IitcCommChannelData;
  getOlderMsgs?: boolean;
  version?: string;
}): IitcCommPostData {
  const getOlderMsgs = options.getOlderMsgs === true;
  const data: IitcCommPostData = {
    ...options.bounds,
    minTimestampMs: -1,
    maxTimestampMs: -1,
    tab: options.channel,
    ...(options.version ? {v: options.version} : {}),
  };

  if (getOlderMsgs) {
    return {
      ...data,
      maxTimestampMs: options.storageHash.oldestTimestamp,
      ...(options.storageHash.oldestGUID ? {plextContinuationGuid: options.storageHash.oldestGUID} : {}),
    };
  }

  const min = options.storageHash.newestTimestamp;
  return {
    ...data,
    minTimestampMs: min,
    ...(options.storageHash.newestGUID ? {plextContinuationGuid: options.storageHash.newestGUID} : {}),
    ...(min > -1 ? {ascendingTimestampOrder: true as const} : {}),
  };
}

export function genIitcCommSendPlextPostData(options: {
  channel: IitcCommChannel;
  message: string;
  latE6: number;
  lngE6: number;
}): IitcCommSendPlextPostData | null {
  const message = options.message.trim();
  if (!message || options.channel === 'alerts') return null;
  return {
    message,
    latE6: options.latE6,
    lngE6: options.lngE6,
    tab: options.channel,
  };
}
