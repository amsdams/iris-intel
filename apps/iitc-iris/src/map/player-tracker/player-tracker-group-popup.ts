import type {IitcPlayerTrackerStored} from '@iris/iitc-core';
import type {PlayerTrackerMarkerGroup} from './player-tracker-markers';

export function createPlayerTrackerGroupPopup(
  group: PlayerTrackerMarkerGroup,
  selectedName: string | undefined,
  select: (name?: string) => void,
  createPlayerPopup: (name: string, player: IitcPlayerTrackerStored[string]) => HTMLElement,
  formatAgo: (time: number) => string,
): HTMLElement {
  const selected = group.members.find(member => member.name === selectedName);
  if (group.members.length === 1) {
    const {name, player} = group.members[0];
    return createPlayerPopup(name, player);
  }
  const root = document.createElement('div');
  root.className = 'iitc-iris-player-tracker-popup';
  if (selected) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'iitc-iris-player-tracker-link iitc-iris-player-tracker-back';
    back.textContent = `All agents (${group.members.length})`;
    back.addEventListener('click', event => {
      event.stopPropagation();
      select();
    });
    root.append(back, createPlayerPopup(selected.name, selected.player));
    return root;
  }
  const title = document.createElement('strong');
  title.textContent = `${group.members.length} agents last seen here`;
  const list = document.createElement('ul');
  list.className = 'iitc-iris-player-tracker-agents';
  for (const {name, player} of group.members) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const nickname = document.createElement('span');
    nickname.className = `iitc-iris-player-tracker-name iitc-iris-player-tracker-${player.team}`;
    nickname.textContent = name;
    const age = document.createElement('span');
    age.textContent = `${formatAgo(player.events[player.events.length - 1].time)} ago`;
    button.append(nickname, age);
    button.addEventListener('click', event => {
      // Updating the popup detaches this button before Leaflet sees the bubbled click.
      event.stopPropagation();
      select(name);
    });
    item.append(button);
    list.append(item);
  }
  root.append(title, list);
  return root;
}
