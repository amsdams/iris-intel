import {describe, expect, it, vi} from 'vitest';
import type {Marker} from 'leaflet';
import type {IitcPlayerTrackerStored} from '@iris/iitc-core';
import {createPlayerTrackerMarkers, groupPlayerTrackerMarkers} from './player-tracker-markers';

function player(time = 1000): IitcPlayerTrackerStored[string] {
  return {team: 'R', events: [{time, latlngs: [[52, 4]], name: 'Portal', actions: []}]};
}

function setup(): {
  markers: ReturnType<typeof createPlayerTrackerMarkers>;
  marker: ReturnType<typeof mockMarker>;
  popup: {update: ReturnType<typeof vi.fn>};
  createMarker: ReturnType<typeof vi.fn>;
  createPopup: ReturnType<typeof vi.fn>;
  updateMarker: ReturnType<typeof vi.fn>;
  open: () => void;
  isOpen: () => boolean;
} {
  let popupOpen = false;
  let popupContent: (() => HTMLElement) | undefined;
  const popup = {update: vi.fn()};
  const marker = mockMarker(popup, () => {popupOpen = false;}, content => {popupContent = content;});
  const createMarker = vi.fn<Parameters<typeof createPlayerTrackerMarkers>[0]['createMarker']>(() => marker as unknown as Marker);
  const createPopup = vi.fn<Parameters<typeof createPlayerTrackerMarkers>[0]['createPopup']>(() => ({}) as HTMLElement);
  const updateMarker = vi.fn();
  const markers = createPlayerTrackerMarkers({createMarker, createPopup, updateMarker});
  return {markers, marker, popup, createMarker, createPopup, updateMarker,
    open: (): void => {popupOpen = true; popupContent?.();}, isOpen: (): boolean => popupOpen};
}

function mockMarker(popup: {update: () => void}, remove: () => void, bind: (content: () => HTMLElement) => void): {
  bindPopup: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  getLatLng: ReturnType<typeof vi.fn>;
  setLatLng: ReturnType<typeof vi.fn>;
  setOpacity: ReturnType<typeof vi.fn>;
  getPopup: () => {update: () => void};
  remove: ReturnType<typeof vi.fn>;
} {
  return {
    bindPopup: vi.fn(bind),
    on: vi.fn(),
    getLatLng: vi.fn(() => ({equals: vi.fn(() => true)})),
    setLatLng: vi.fn(),
    setOpacity: vi.fn(),
    getPopup: (): {update: () => void} => popup,
    remove: vi.fn(remove),
  };
}

describe('player tracker marker lifetime', () => {
  it('keeps an open popup through the COMM refresh caused by its auto-pan', () => {
    const test = setup();
    test.markers.render({Agent: player()}, 2000);
    test.open();
    // COMM processing clones players, even when the response contains no new activity.
    test.markers.render({Agent: player()}, 3000);
    expect(test.isOpen()).toBe(true);
    expect(test.createMarker).toHaveBeenCalledOnce();
    expect(test.marker.remove).not.toHaveBeenCalled();
    expect(test.marker.setLatLng).not.toHaveBeenCalled();
    expect(test.marker.bindPopup).toHaveBeenCalledOnce();
    expect(test.popup.update).not.toHaveBeenCalled();
    expect(test.marker.setOpacity).toHaveBeenCalledTimes(2);
  });

  it('updates location, team and popup history without replacing the marker', () => {
    const test = setup();
    test.markers.render({Agent: player()}, 2000);
    test.open();
    const updated = player(3000);
    updated.team = 'E';
    updated.events[0].latlngs = [[53, 5]];
    test.marker.getLatLng.mockReturnValue({equals: vi.fn(() => false)});
    test.markers.render({Agent: updated}, 4000);
    expect(test.marker.setLatLng).toHaveBeenCalledWith([53, 5]);
    expect(test.updateMarker).toHaveBeenCalledOnce();
    expect(test.popup.update).toHaveBeenCalledOnce();
    expect(test.isOpen()).toBe(true);
    test.open();
    expect(test.createPopup).toHaveBeenLastCalledWith(expect.objectContaining({members: [{name: 'Agent', player: updated}]}), undefined, expect.any(Function));
  });

  it('removes hidden or expired players and releases all markers on map disposal', () => {
    const test = setup();
    test.markers.render({Agent: player()}, 2000);
    test.open();
    test.markers.render({}, 3000);
    expect(test.isOpen()).toBe(false);
    expect(test.marker.remove).toHaveBeenCalledOnce();
    test.markers.render({Agent: player()}, 4000);
    expect(test.createMarker).toHaveBeenCalledTimes(2);
    test.markers.clear();
    test.markers.clear();
    expect(test.marker.remove).toHaveBeenCalledTimes(2);
    test.markers.render({Agent: player()}, 5000);
    expect(test.createMarker).toHaveBeenCalledTimes(3);
  });
});


describe('player tracker shared-position markers', () => {
  it('groups colocated agents across factions, sorts names, and keeps nearby positions separate', () => {
    const other = player();
    other.team = 'E';
    const nearby = player();
    nearby.events[0].latlngs = [[52.000001, 4]];
    const groups = groupPlayerTrackerMarkers({Zulu: player(), Alpha: other, Nearby: nearby, Empty: {team: 'R', events: []}});
    expect(groups).toHaveLength(2);
    expect(groups[0].latLng).toEqual([52, 4]);
    expect(groups[0].members.map(member => member.name)).toEqual(['Alpha', 'Zulu']);
    expect(groups[1].key).toBe('player:Nearby');
  });

  it('retains a count marker and selected history through refreshes and returns to the list when that agent leaves', () => {
    const test = setup();
    expect(test.markers.render({Alpha: player(), Bravo: player(), Charlie: player()}, 2000)).toBe(1);
    test.open();
    const select = test.createPopup.mock.calls[0][2] as (name?: string) => void;
    select('Bravo');
    test.open();
    expect(test.createPopup.mock.calls.at(-1)?.[1]).toBe('Bravo');
    test.markers.render({Charlie: player(), Bravo: player(1500), Alpha: player()}, 3000);
    test.open();
    expect(test.createPopup.mock.calls.at(-1)?.[1]).toBe('Bravo');
    expect(test.createMarker).toHaveBeenCalledOnce();
    expect(test.marker.remove).not.toHaveBeenCalled();
    test.markers.render({Alpha: player(), Charlie: player()}, 4000);
    test.open();
    expect(test.createPopup.mock.calls.at(-1)?.[1]).toBeUndefined();
    expect(test.createMarker).toHaveBeenCalledOnce();
    select('Alpha');
    select();
    test.open();
    expect(test.createPopup.mock.calls.at(-1)?.[1]).toBeUndefined();
  });

  it('replaces a group with a normal pin when a faction filter leaves one agent, then cleans up', () => {
    const test = setup();
    test.markers.render({Alpha: player(), Bravo: player()}, 2000);
    test.markers.render({Alpha: player()}, 3000);
    expect(test.marker.remove).toHaveBeenCalledOnce();
    expect(test.createMarker).toHaveBeenCalledTimes(2);
    expect(test.createMarker).toHaveBeenLastCalledWith(expect.objectContaining({members: [{name: 'Alpha', player: player()}]}), 3000);
    test.markers.clear();
    expect(test.marker.remove).toHaveBeenCalledTimes(2);
  });
});
