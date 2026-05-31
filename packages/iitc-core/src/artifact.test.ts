import {describe, expect, it} from 'vitest';
import {getIitcPortalArtifacts, parseIitcArtifactBrief} from './artifact';

describe('artifact', () => {
  it('parses artifact brief fragment and target entries', () => {
    const brief = parseIitcArtifactBrief([
      [['abaddon2', ['frag-a', 'frag-b']]],
      [['targetres', ['target-a']]],
    ]);

    expect(brief).toEqual({
      fragment: {abaddon2: [['frag-a', 'frag-b']]},
      target: {targetres: [['target-a']]},
    });
    expect(getIitcPortalArtifacts(brief)).toEqual([
      {role: 'fragment', type: 'abaddon2', ids: ['frag-a', 'frag-b']},
      {role: 'target', type: 'targetres', ids: ['target-a']},
    ]);
  });
});
