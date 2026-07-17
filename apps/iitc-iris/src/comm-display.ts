import type {IitcIrisCommMessage, IitcIrisCommState} from './messages';

export function formatCommActor(message: IitcIrisCommMessage): string {
  return message.player || message.players[0] || (message.auto ? 'system' : 'unknown');
}

export function getCommDisplayParts(message: IitcIrisCommMessage): IitcIrisCommMessage['parts'] {
  const actor = formatCommActor(message).replace(/^@/, '').toLowerCase();
  return message.parts.filter((part) => {
    if (part.type !== 'player') return true;
    return part.text.replace(/^@/, '').toLowerCase() !== actor;
  }).map((part, index) => part.type === 'text' && index === 0
    ? {...part, text: part.text.replace(/\s+/g, ' ').replace(/^\s*[,.:;-]\s*/, '').trimStart()}
    : part)
    .filter((part) => part.type !== 'text' || part.text.length > 0);
}

export function formatCommContextTitle(message: IitcIrisCommMessage): string {
  const context = [
    ...message.players.map((player) => `player: ${player}`),
    ...message.portals.map((portal) => `portal: ${portal.name || portal.address || 'portal'}`),
  ];
  return context.length > 0 ? context.join('\n') : message.text || message.type;
}

export function formatCommTime(time: number): string {
  if (!Number.isFinite(time)) return '-';
  return new Date(time).toLocaleTimeString();
}

export function formatCommBounds(bounds: IitcIrisCommState['bounds']): string {
  return bounds ? `${bounds.minLatE6},${bounds.minLngE6} to ${bounds.maxLatE6},${bounds.maxLngE6}` : '-';
}

export function getCommTeamClass(team?: string): string {
  if (team === 'E') return 'is-enlightened';
  if (team === 'R') return 'is-resistance';
  if (team === 'M') return 'is-machina';
  return '';
}
