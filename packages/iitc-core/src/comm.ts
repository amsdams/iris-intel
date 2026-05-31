export type IitcTeamId = 'E' | 'R' | 'N' | 'M';

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
