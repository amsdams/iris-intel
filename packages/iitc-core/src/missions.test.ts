import {describe, expect, it} from 'vitest';
import {
  formatIitcMissionDuration,
  getIitcMissionBounds,
  parseIitcMissionDetailsResponse,
  parseIitcTopMissionsResponse,
} from './missions';

describe('IITC missions parser', () => {
  it('parses top mission summaries from Intel result rows', () => {
    const missions = parseIitcTopMissionsResponse({
      result: [
        ['mission-a', 'Mission 10', 'https://example.com/a.png', 780000, 1800000],
        ['mission-b', 'Mission 2', undefined, 1000000, 900000],
      ],
    });

    expect(missions).toEqual([
      {
        guid: 'mission-a',
        title: 'Mission 10',
        image: 'https://example.com/a.png',
        ratingE6: 780000,
        medianCompletionTimeMs: 1800000,
      },
      {
        guid: 'mission-b',
        title: 'Mission 2',
        image: undefined,
        ratingE6: 1000000,
        medianCompletionTimeMs: 900000,
      },
    ]);
  });

  it('parses mission details, portal waypoints, field trip waypoints, and bounds', () => {
    const mission = parseIitcMissionDetailsResponse({
      result: [
        'mission-guid',
        'Canal walk',
        'Follow the route.',
        'agentName',
        'RESISTANCE',
        900000,
        2700000,
        123,
        1,
        [
          [false, 'portal-guid', 'Start portal', 1, 1, ['p', 'Portal title', 52370000, 4890000]],
          [true, 'field-trip-guid', 'Hidden clue', 2, 7, ['f', 52371000, 4891000]],
        ],
        'https://example.com/mission.png',
      ],
    });

    expect(mission?.authorTeam).toBe('R');
    expect(mission?.type).toBe('Sequential');
    expect(mission?.routeLengthMeters).toBeGreaterThan(130);
    expect(mission?.waypoints).toMatchObject([
      {
        index: 0,
        hidden: false,
        guid: 'portal-guid',
        type: 'Portal',
        objective: 'Hack this Portal',
        latE6: 52370000,
        lngE6: 4890000,
        portalGuid: 'portal-guid',
        portalTitle: 'Portal title',
      },
      {
        index: 1,
        hidden: true,
        guid: 'field-trip-guid',
        type: 'Field Trip',
        objective: 'View this Field Trip Waypoint',
        latE6: 52371000,
        lngE6: 4891000,
      },
    ]);
    expect(mission ? getIitcMissionBounds(mission) : null).toEqual({
      south: 52.37,
      west: 4.89,
      north: 52.371,
      east: 4.891,
    });
  });

  it('normalizes mission type, team, duration, and empty route edge cases', () => {
    expect(formatIitcMissionDuration(3 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe('3h 30m');
    expect(formatIitcMissionDuration(0)).toBeUndefined();

    const mission = parseIitcMissionDetailsResponse({
      result: [
        'hidden-guid',
        'Hidden-only mission',
        'Find the hidden target.',
        'agentName',
        'ENLIGHTENED',
        '875000',
        '3600000',
        '42',
        '3',
        [
          [true, 'hidden-portal-guid', 'Hidden target', '1', '8', ['p', 'Hidden portal']],
        ],
      ],
    });

    expect(mission).toMatchObject({
      authorTeam: 'E',
      ratingE6: 875000,
      medianCompletionTimeMs: 3600000,
      numUniqueCompletedPlayers: 42,
      typeNum: 3,
      type: 'Hidden',
      routeLengthMeters: undefined,
    });
    expect(mission?.waypoints[0]).toMatchObject({
      hidden: true,
      type: 'Portal',
      objective: 'Enter the Passphrase',
      latE6: undefined,
      lngE6: undefined,
      portalGuid: 'hidden-portal-guid',
      portalTitle: 'Hidden portal',
    });
    expect(mission ? getIitcMissionBounds(mission) : null).toBeNull();
  });
});
