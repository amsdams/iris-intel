import {describe, expect, it} from 'vitest';
import {
  buildUserLocationMessage,
  parseAndBuildViewInputJump,
} from './content-map-navigation';

describe('content-map-navigation', () => {
  it('parses valid view input coordinate string', () => {
    const res = parseAndBuildViewInputJump('52.3,4.9,15', 10);
    expect(res).not.toHaveProperty('error');
    if ('lat' in res) {
      expect(res.lat).toBe(52.3);
      expect(res.lng).toBe(4.9);
      expect(res.zoom).toBe(15);
      expect(res.statusText).toBe('jumped to location and zoom');
    }
  });

  it('returns error on invalid view input', () => {
    const res = parseAndBuildViewInputJump('invalid-string', 10);
    expect(res).toEqual({error: 'invalid coords or url'});
  });

  it('creates user location message', () => {
    const msg = buildUserLocationMessage(52.3, 4.9, 20);
    expect(msg.userLat).toBe(52.3);
    expect(msg.userLng).toBe(4.9);
    expect(msg.userAccuracy).toBe(20);
  });
});
