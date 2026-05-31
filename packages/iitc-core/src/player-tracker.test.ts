import {describe, expect, it} from 'vitest';
import {parseMsgData} from './comm';
import {getIitcPlayerTrackerLatLng, processIitcPlayerTrackerData, pruneIitcPlayerTrackerStored} from './player-tracker';

function message(row: Parameters<typeof parseMsgData>[0]) {
  const parsed = parseMsgData(row);
  if (!parsed) throw new Error('expected parsed COMM message');
  return parsed;
}

describe('processIitcPlayerTrackerData', () => {
  it('extracts player movement from IITC COMM portal messages', () => {
    const first = message(['m1', 1000, {plext: {
      text: 'Agent captured Portal One',
      markup: [
        ['PLAYER', {plain: 'Agent', team: 'RESISTANCE'}],
        ['TEXT', {plain: ' captured '}],
        ['PORTAL', {name: 'Portal One', address: 'One St', latE6: 52000000, lngE6: 4000000}],
      ],
      categories: 1,
      team: 'RESISTANCE',
      plextType: 'SYSTEM_BROADCAST',
    }}]);
    const second = message(['m2', 2000, {plext: {
      text: 'Agent deployed Portal Two',
      markup: [
        ['PLAYER', {plain: 'Agent', team: 'RESISTANCE'}],
        ['TEXT', {plain: ' deployed '}],
        ['PORTAL', {name: 'Portal Two', address: 'Two St', latE6: 52100000, lngE6: 4100000}],
      ],
      categories: 1,
      team: 'RESISTANCE',
      plextType: 'SYSTEM_BROADCAST',
    }}]);

    const result = processIitcPlayerTrackerData([second, first], {}, 3000);

    expect(result.processedMessages).toBe(2);
    expect(result.touchedPlayers).toEqual(['Agent']);
    expect(result.stored.Agent.team).toBe('R');
    expect(result.stored.Agent.events.map((event) => event.name)).toEqual(['Portal One', 'Portal Two']);
    expect(getIitcPlayerTrackerLatLng(result.stored.Agent.events[1])).toEqual([52.1, 4.1]);
  });

  it('combines same-time portal actions into one event with averaged coordinates', () => {
    const first = message(['m1', 1000, {plext: {
      text: 'Agent destroyed Resonator A',
      markup: [
        ['PLAYER', {plain: 'Agent', team: 'ENLIGHTENED'}],
        ['TEXT', {plain: ' destroyed a Resonator on '}],
        ['PORTAL', {name: 'Portal A', latE6: 52000000, lngE6: 4000000}],
      ],
      categories: 1,
      team: 'ENLIGHTENED',
      plextType: 'SYSTEM_BROADCAST',
    }}]);
    const second = message(['m2', 1000, {plext: {
      text: 'Agent destroyed Resonator B',
      markup: [
        ['PLAYER', {plain: 'Agent', team: 'ENLIGHTENED'}],
        ['TEXT', {plain: ' destroyed a Resonator on '}],
        ['PORTAL', {name: 'Portal B', latE6: 52200000, lngE6: 4200000}],
      ],
      categories: 1,
      team: 'ENLIGHTENED',
      plextType: 'SYSTEM_BROADCAST',
    }}]);

    const result = processIitcPlayerTrackerData([first, second], {}, 2000);

    expect(result.stored.Agent.events).toHaveLength(1);
    expect(result.stored.Agent.events[0].latlngs).toEqual([[52, 4], [52.2, 4.2]]);
    expect(getIitcPlayerTrackerLatLng(result.stored.Agent.events[0])).toEqual([52.1, 4.1]);
  });

  it('skips destroyed link and old messages like IITC player tracker', () => {
    const destroyedLink = message(['m1', 1000, {plext: {
      text: 'Agent destroyed the Link',
      markup: [
        ['PLAYER', {plain: 'Agent', team: 'RESISTANCE'}],
        ['TEXT', {plain: ' destroyed the Link '}],
        ['PORTAL', {name: 'Origin', latE6: 52000000, lngE6: 4000000}],
      ],
      categories: 1,
      team: 'RESISTANCE',
      plextType: 'SYSTEM_BROADCAST',
    }}]);
    const old = message(['m2', 100, {plext: {
      text: 'OldAgent captured Portal',
      markup: [
        ['PLAYER', {plain: 'OldAgent', team: 'ENLIGHTENED'}],
        ['TEXT', {plain: ' captured '}],
        ['PORTAL', {name: 'Old', latE6: 52000000, lngE6: 4000000}],
      ],
      categories: 1,
      team: 'ENLIGHTENED',
      plextType: 'SYSTEM_BROADCAST',
    }}]);

    const result = processIitcPlayerTrackerData([destroyedLink, old], {}, 10_000, 1000);

    expect(result.processedMessages).toBe(0);
    expect(result.stored).toEqual({});
  });

  it('keeps machina activity available for the IRIS faction layer split', () => {
    const machina = message(['m1', 1000, {plext: {
      text: 'Machina deployed Portal Red',
      markup: [
        ['PLAYER', {plain: 'Machina', team: 'MACHINA'}],
        ['TEXT', {plain: ' deployed '}],
        ['PORTAL', {name: 'Portal Red', latE6: 52000000, lngE6: 4000000}],
      ],
      categories: 1,
      team: 'MACHINA',
      plextType: 'SYSTEM_BROADCAST',
    }}]);

    const result = processIitcPlayerTrackerData([machina], {}, 2000);

    expect(result.processedMessages).toBe(1);
    expect(result.stored.Machina.team).toBe('M');
  });
});

describe('pruneIitcPlayerTrackerStored', () => {
  it('drops expired players and old leading events', () => {
    const pruned = pruneIitcPlayerTrackerStored({
      Gone: {team: 'R', events: [{latlngs: [[1, 1]], time: 1000, actions: []}]},
      Kept: {team: 'E', events: [
        {latlngs: [[1, 1]], time: 1000, actions: []},
        {latlngs: [[2, 2]], time: 5000, actions: []},
      ]},
    }, 6000, 2000);

    expect(pruned).toEqual({
      Kept: {team: 'E', events: [{latlngs: [[2, 2]], time: 5000, actions: []}]},
    });
  });
});
