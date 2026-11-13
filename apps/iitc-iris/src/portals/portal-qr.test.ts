import {describe, expect, it} from 'vitest';
import jsQR from 'jsqr';
import {createPortalQr} from './portal-qr';
import {getPortalPrimeLink} from './portal-directions';

describe('portal sharing', () => {
  it('uses the IITC Prime portal URL and safely encodes the GUID', () => {
    expect(getPortalPrimeLink('abc.16')).toBe('https://link.ingress.com/portal/abc.16');
    expect(getPortalPrimeLink('a/?#')).toBe('https://link.ingress.com/portal/a%2F%3F%23');
  });

  it.each(['GEO:52.370123,4.893123', 'GEO:-33.8688,151.2093', 'GEO:0,0'])(
    'creates a scannable QR code for %s', payload => {
      const code = createPortalQr(payload);
      const scale = 8;
      const width = code.size * scale;
      const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
      for (let row = 0; row < code.qr.getModuleCount(); row++) for (let col = 0; col < code.qr.getModuleCount(); col++) {
        if (!code.qr.isDark(row, col)) continue;
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const offset = (((row + 4) * scale + dy) * width + (col + 4) * scale + dx) * 4;
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
        }
      }
      expect(jsQR(pixels, width, width)?.data).toBe(payload);
    },
  );
});
