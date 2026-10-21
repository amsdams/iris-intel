import type {Marker} from 'leaflet';
import {getIitcPlayerTrackerLatLng, getIitcPlayerTrackerEventOpacity, type IitcPlayerTrackerStored} from '@iris/iitc-core';

/** Retain marker identity so COMM refreshes cannot close a bound popup during auto-pan. */
export function createPlayerTrackerMarkers(options: {
  createMarker: (name: string, player: IitcPlayerTrackerStored[string], now: number) => Marker;
  createPopup: (name: string, player: IitcPlayerTrackerStored[string]) => HTMLElement;
  updateMarker: (marker: Marker, name: string, player: IitcPlayerTrackerStored[string], previous: IitcPlayerTrackerStored[string]) => void;
}): {render: (players: IitcPlayerTrackerStored, now: number) => void; clear: () => void} {
  const entries = new Map<string, {marker: Marker; player: IitcPlayerTrackerStored[string]; signature: string}>();
  return {
    render(players, now): void {
      for (const [name, entry] of entries) {
        if (players[name]) continue;
        entry.marker.remove();
        entries.delete(name);
      }
      for (const [name, player] of Object.entries(players)) {
        const signature = JSON.stringify(player);
        let entry = entries.get(name);
        if (!entry) {
          entry = {marker: options.createMarker(name, player, now), player, signature};
          const current = entry;
          current.marker.bindPopup(() => options.createPopup(name, current.player), {
            className: 'iitc-iris-player-tracker-leaflet-popup',
          });
          entries.set(name, current);
        } else {
          const last = player.events[player.events.length - 1];
          const latLng = getIitcPlayerTrackerLatLng(last);
          if (!entry.marker.getLatLng().equals(latLng)) entry.marker.setLatLng(latLng);
          options.updateMarker(entry.marker, name, player, entry.player);
          entry.player = player;
          if (entry.signature !== signature) {
            entry.signature = signature;
            entry.marker.getPopup()?.update();
          }
        }
        const last = player.events[player.events.length - 1];
        entry.marker.setOpacity(getIitcPlayerTrackerEventOpacity(last.time, now));
      }
    },
    clear(): void {
      for (const {marker} of entries.values()) marker.remove();
      entries.clear();
    },
  };
}
