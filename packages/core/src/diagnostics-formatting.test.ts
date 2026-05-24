import { describe, expect, it } from 'vitest';
import {
  buildDiagnosticsEnvironmentSummary,
  formatDiagnosticCount,
  formatDiagnosticMs,
  getBrowserLabel,
} from './diagnostics-formatting';

describe('diagnostics formatting', () => {
  it('formats diagnostic numbers and timings consistently', () => {
    expect(formatDiagnosticMs(17.4)).toBe('17ms');
    expect(formatDiagnosticMs(null)).toBe('-');
    expect(formatDiagnosticCount(12345)).toBe('12,345');
    expect(formatDiagnosticCount(undefined)).toBe('-');
  });

  it('detects common browser labels from user agents', () => {
    expect(getBrowserLabel('Mozilla/5.0 Firefox/149.0')).toBe('Firefox/149.0');
    expect(getBrowserLabel('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36')).toBe('Chrome/148.0.0.0');
    expect(getBrowserLabel('Mozilla/5.0 Version/18.0 Safari/605.1.15')).toBe('Safari/18.0');
    expect(getBrowserLabel('Mozilla/5.0 Edg/148.0.0.0')).toBe('Edge 148.0.0.0');
  });

  it('builds an environment summary with optional extras', () => {
    expect(buildDiagnosticsEnvironmentSummary('CONTEXT v1', {
      browser: 'Chrome/148',
      platform: 'MacIntel',
      viewportWidth: 1177,
      viewportHeight: 934,
      devicePixelRatio: 2,
      touchPoints: 0,
      pointer: 'fine',
      hover: 'yes',
    }, {
      mapStyle: 'INGRESS',
      overlays: 'none',
    })).toBe('CONTEXT v1 browser Chrome/148 platform MacIntel viewport 1177x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle INGRESS overlays none');
  });

});
