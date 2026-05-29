import {describe, expect, it} from 'vitest';
import {ArtifactParser} from './ArtifactParser';
import type {ArtifactData} from './intel-types';

describe('ArtifactParser', () => {
  it('parses legacy mock artifact rows', () => {
    const artifacts = ArtifactParser.parse({
      result: [
        ['portal-1', 123, ['shard', ['s1', 's2']]],
      ],
    });

    expect(artifacts).toEqual([
      {portalId: 'portal-1', type: 'shard', ids: ['s1', 's2']},
    ]);
  });

  it('parses IITC-shaped artifact portal summaries', () => {
    const data: ArtifactData = {
      result: {
        'portal-1': [
          'p',
          'ENLIGHTENED',
          52_373_000,
          4_895_000,
          6,
          80,
          8,
          'image',
          'Artifact Portal',
          ['event-ornament'],
          false,
          false,
          [[['jarvis', 'fragment-1']], [['jarvis']]],
          123,
        ],
      },
    };

    expect(ArtifactParser.parse(data)).toEqual([
      {
        portalId: 'portal-1',
        type: 'jarvis',
        ids: ['fragment-1'],
        lat: 52.373,
        lng: 4.895,
        team: 'E',
        level: 6,
        health: 80,
        name: 'Artifact Portal',
        ornaments: ['event-ornament'],
      },
      {
        portalId: 'portal-1',
        type: 'jarvis-target',
        ids: ['jarvis'],
        lat: 52.373,
        lng: 4.895,
        team: 'E',
        level: 6,
        health: 80,
        name: 'Artifact Portal',
        ornaments: ['event-ornament'],
      },
    ]);
  });
});
