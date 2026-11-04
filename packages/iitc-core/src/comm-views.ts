export type IitcCommAction = 'chat' | 'capture' | 'deploy' | 'destroy' | 'link' | 'field' | 'other';
export interface IitcCommViewMessage {
  text: string;
  auto?: boolean;
  team: string;
  playerTeam?: string;
  player?: string;
  players: readonly string[];
  parts: readonly {type: string; text: string}[];
  portals: readonly {name?: string; address?: string; guid?: string; latE6?: number; lngE6?: number}[];
}
export interface IitcCommFilters {
  kind: 'all' | 'chat' | 'activity';
  action: 'all' | IitcCommAction;
  team: 'all' | 'R' | 'E' | 'M' | 'N';
  query: string;
  agent: string;
  portal: string;
}
export const DEFAULT_IITC_COMM_FILTERS: IitcCommFilters = {
  kind: 'all', action: 'all', team: 'all', query: '', agent: '', portal: '',
};
const actions = ['all', 'chat', 'capture', 'deploy', 'destroy', 'link', 'field', 'other'];
export function normalizeIitcCommFilters(value: unknown): IitcCommFilters {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (key: string): string => typeof source[key] === 'string' ? source[key].slice(0, 500) : '';
  return {
    kind: source.kind === 'chat' || source.kind === 'activity' ? source.kind : 'all',
    action: actions.includes(String(source.action)) ? source.action as IitcCommFilters['action'] : 'all',
    team: ['R', 'E', 'M', 'N'].includes(String(source.team)) ? source.team as IitcCommFilters['team'] : 'all',
    query: text('query'), agent: text('agent'), portal: text('portal'),
  };
}
/** Classify known English Intel action text; retain unfamiliar activity as Other. */
export function getIitcCommAction(message: IitcCommViewMessage): IitcCommAction {
  if (message.auto === false || message.auto === undefined && message.parts.every(part => part.type !== 'portal')) return 'chat';
  const text = message.parts.filter(part => part.type === 'text').map(part => part.text).join(' ') || message.text;
  if (/\bdestroy(?:ed|s|ing)?\b/i.test(text)) return 'destroy';
  if (/\bcaptur(?:ed|es|ing|e)\b/i.test(text)) return 'capture';
  if (/\bdeploy(?:ed|s|ing)?\b/i.test(text)) return 'deploy';
  if (/\b(control field|created a field)\b/i.test(text)) return 'field';
  if (/\blink(?:ed|s|ing)?\b/i.test(text)) return 'link';
  return 'other';
}
export function matchesIitcCommFilters(message: IitcCommViewMessage, filters: IitcCommFilters): boolean {
  const action = getIitcCommAction(message);
  if (filters.kind === 'chat' && action !== 'chat' || filters.kind === 'activity' && action === 'chat') return false;
  if (filters.action !== 'all' && action !== filters.action) return false;
  if (filters.team !== 'all' && (message.playerTeam || message.team) !== filters.team) return false;
  const includes = (haystack: string, needle: string): boolean => haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
  if (!includes([message.player, ...message.players].join(' '), filters.agent)) return false;
  const portals = message.portals.map(portal => `${portal.name ?? ''} ${portal.address ?? ''}`).join(' ');
  if (!includes(portals, filters.portal)) return false;
  return includes([message.text, ...message.parts.map(part => part.text), ...message.players, portals].join(' '), filters.query);
}

export function matchesIitcCommPortal(message: IitcCommViewMessage,
  portal: {guid?: string; latE6: number; lngE6: number}): boolean {
  return message.portals.some(candidate => candidate.guid && portal.guid ? candidate.guid === portal.guid :
    candidate.latE6 === portal.latE6 && candidate.lngE6 === portal.lngE6);
}

/** Complete one unambiguous visible nickname at the cursor; leave native Tab otherwise. */
export function completeIitcCommNickname(text: string, cursor: number, names: readonly string[]): {text: string; cursor: number} | undefined {
  const match = /(?:^|\s)(@?)([\w-]+)$/.exec(text.slice(0, cursor));
  if (!match) return undefined;
  const word = match[2];
  const candidates = [...new Set(names)].filter(name => name.toLowerCase().startsWith(word.toLowerCase()));
  if (candidates.length !== 1) return undefined;
  const replacement = `@${candidates[0]} `;
  const start = cursor - word.length - match[1].length;
  return {text: text.slice(0, start) + replacement + text.slice(cursor), cursor: start + replacement.length};
}

/** Safe URL runs for JSX rendering, never HTML injection or arbitrary schemes. */
export function splitIitcCommTextLinks(text: string): {text: string; href?: string}[] {
  const result: {text: string; href?: string}[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/gi;
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > position) result.push({text: text.slice(position, match.index)});
    const url = match[0].replace(/[.,;!?\])}]+$/, '');
    let href: string | undefined;
    try { href = new URL(url).href; } catch { /* Keep malformed URLs as text. */ }
    result.push({text: url, href});
    position = match.index + url.length;
  }
  if (position < text.length) result.push({text: text.slice(position)});
  return result;
}
