import {describe, expect, it} from 'vitest';
import {parseIitcPortalDetailsResponse} from './portal-details';

describe('portal details parser', () => {
  it('parses IITC getPortalDetails payloads and derived mitigation', () => {
    const details = parseIitcPortalDetailsResponse({
      result: [
        'p',
        'R',
        52373570,
        4883326,
        8,
        100,
        8,
        'https://example.test/portal.jpg',
        'Scheepsbehoeften',
        [],
        false,
        false,
        null,
        1717027200000,
        [
          ['AgentA', 'RES_SHIELD', 'RARE', {MITIGATION: '70'}],
          ['AgentB', 'LINK_AMPLIFIER', 'RARE', {LINK_RANGE_MULTIPLIER: '2000'}],
          ['AgentC', 'TURRET', 'VERY_RARE', {HIT_BONUS: '150', ATTACK_FREQUENCY: '150'}],
          null,
        ],
        [
          ['AgentA', 8, 6000],
          ['AgentB', 7, 5000],
          null,
        ],
        'AgentA',
        null,
        3,
      ],
    }, 'portal.16', 6);

    expect(details).toMatchObject({
      guid: 'portal.16',
      team: 'R',
      latE6: 52373570,
      lngE6: 4883326,
      level: 8,
      health: 100,
      resCount: 8,
      image: 'https://example.test/portal.jpg',
      title: 'Scheepsbehoeften',
      owner: 'AgentA',
      visited: true,
      captured: true,
      scoutControlled: false,
      hasMissionsStartingHere: false,
    });
    expect(details?.mods).toHaveLength(3);
    expect(details?.resonators).toHaveLength(2);
    expect(details?.mitigation.shields).toBe(70);
    expect(details?.mitigation.links).toBeGreaterThan(0);
    expect(details?.mitigation.total).toBeLessThanOrEqual(95);
  });
});
