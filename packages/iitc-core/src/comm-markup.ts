import {teamStringToId, trimSenderSuffix, type IitcCommMarkupValue, type IitcCommMessage, type IitcTeamId} from './comm-protocol';

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

function cloneMarkup(markup: [string, IitcCommMarkupValue][]): [string, IitcCommMarkupValue][] {
  return markup.map(([type, value]) => [type, {...value}]);
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
    case 'TEXT': {
      const team = value.team ? teamStringToId(value.team) : undefined;
      // IITC renderText treats faction-tagged neutral/unknown text as Machina.
      return {type: 'text', text: value.plain ?? '', team: team === 'N' ? 'M' : team};
    }
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
