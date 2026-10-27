import type {Marker} from 'leaflet';
import {getIitcPlayerTrackerLatLng, getIitcPlayerTrackerEventOpacity, type IitcPlayerTrackerStored} from '@iris/iitc-core';

export interface PlayerTrackerMarkerGroup {
  key: string;
  latLng: [number, number];
  members: {name: string; player: IitcPlayerTrackerStored[string]}[];
}

/** Group actual shared positions, independently of zoom or marker size. */
export function groupPlayerTrackerMarkers(players: IitcPlayerTrackerStored): PlayerTrackerMarkerGroup[] {
  const positions = new Map<string, PlayerTrackerMarkerGroup>();
  for (const [name, player] of Object.entries(players)) {
    const last = player.events[player.events.length - 1];
    if (!last) continue;
    const latLng = getIitcPlayerTrackerLatLng(last);
    const positionKey = JSON.stringify(latLng);
    let group = positions.get(positionKey);
    if (!group) {
      group = {key: `position:${positionKey}`, latLng, members: []};
      positions.set(positionKey, group);
    }
    group.members.push({name, player});
  }
  for (const group of positions.values()) {
    group.members.sort((a, b) => a.name.localeCompare(b.name));
    // A lone agent can move without replacing their marker or closing their popup.
    if (group.members.length === 1) group.key = `player:${group.members[0].name}`;
  }
  return [...positions.values()];
}

/** Retain marker identity and selected agent through COMM refreshes and popup auto-pan. */
export function createPlayerTrackerMarkers(options: {
  createMarker: (group: PlayerTrackerMarkerGroup, now: number) => Marker;
  createPopup: (group: PlayerTrackerMarkerGroup, selectedName: string | undefined, select: (name?: string) => void) => HTMLElement;
  updateMarker: (marker: Marker, group: PlayerTrackerMarkerGroup, previous: PlayerTrackerMarkerGroup) => void;
}): {render: (players: IitcPlayerTrackerStored, now: number) => number; clear: () => void} {
  const entries = new Map<string, {marker: Marker; group: PlayerTrackerMarkerGroup; signature: string; selectedName?: string}>();
  return {
    render(players, now): number {
      const groups = groupPlayerTrackerMarkers(players);
      const keys = new Set(groups.map(group => group.key));
      for (const [key, entry] of entries) {
        if (keys.has(key)) continue;
        entry.marker.remove();
        entries.delete(key);
      }
      for (const group of groups) {
        const signature = JSON.stringify(group);
        let entry = entries.get(group.key);
        if (!entry) {
          entry = {marker: options.createMarker(group, now), group, signature};
          const current = entry;
          current.marker.bindPopup(() => options.createPopup(current.group, current.selectedName, (name) => {
            current.selectedName = name;
            current.marker.getPopup()?.update();
          }), {
            className: 'iitc-iris-player-tracker-leaflet-popup',
          });
          current.marker.on('popupclose', () => {current.selectedName = undefined;});
          entries.set(group.key, current);
        } else {
          if (!entry.marker.getLatLng().equals(group.latLng)) entry.marker.setLatLng(group.latLng);
          options.updateMarker(entry.marker, group, entry.group);
          entry.group = group;
          const selectedName = entry.selectedName;
          if (selectedName && !group.members.some(member => member.name === selectedName)) entry.selectedName = undefined;
          if (entry.signature !== signature) {
            entry.signature = signature;
            entry.marker.getPopup()?.update();
          }
        }
        const latestTime = Math.max(...group.members.map(({player}) => player.events[player.events.length - 1].time));
        entry.marker.setOpacity(getIitcPlayerTrackerEventOpacity(latestTime, now));
      }
      return groups.length;
    },
    clear(): void {
      for (const {marker} of entries.values()) marker.remove();
      entries.clear();
    },
  };
}
