import {describe, expect, it} from 'vitest';
import {
  DEFAULT_HIGHLIGHTER_ID,
  getPortalHighlighter,
  isPortalHighlighterId,
  normalizePortalHighlighterId,
  PORTAL_HIGHLIGHTER_REGISTRY,
} from './highlighter-registry';
import type {IitcIrisPortalHighlighterId} from './messages';

const EXPECTED_HIGHLIGHTER_IDS: IitcIrisPortalHighlighterId[] = [
  'none',
  'level-color',
  'needs-recharge',
  'history-visited',
  'history-not-visited',
  'history-captured',
  'history-not-captured',
  'history-scout-controlled',
  'history-not-scout-controlled',
];

describe('IITC IRIS portal highlighter registry', () => {
  it('keeps current highlighter ids and defaults registered in UI order', () => {
    expect(DEFAULT_HIGHLIGHTER_ID).toBe('none');
    expect(PORTAL_HIGHLIGHTER_REGISTRY.map((entry) => entry.id)).toEqual(EXPECTED_HIGHLIGHTER_IDS);
    expect(PORTAL_HIGHLIGHTER_REGISTRY.every((entry) => entry.label && entry.title)).toBe(true);
  });

  it('normalizes persisted ids and old combined history ids', () => {
    expect(isPortalHighlighterId('level-color')).toBe(true);
    expect(isPortalHighlighterId('missing')).toBe(false);
    expect(normalizePortalHighlighterId('history-visited-captured')).toBe('history-visited');
    expect(normalizePortalHighlighterId('history-not-visited-captured')).toBe('history-not-visited');
    expect(normalizePortalHighlighterId('missing')).toBe('none');
  });

  it('marks only the two fill highlighters as render-policy fill modes', () => {
    expect(getPortalHighlighter('level-color')).toMatchObject({levelFill: true});
    expect(getPortalHighlighter('needs-recharge')).toMatchObject({healthFill: true});
    expect(getPortalHighlighter('history-visited').levelFill).toBeUndefined();
    expect(getPortalHighlighter('history-visited').healthFill).toBeUndefined();
  });

  it('keeps history style callbacks aligned with the current positive yellow, target red rule', () => {
    expect(getPortalHighlighter('history-visited').getStyle?.({portal: {} as never, history: {visited: true, captured: false, scoutControlled: false}})).toMatchObject({
      fillColor: 'yellow',
      fillOpacity: 1,
    });
    expect(getPortalHighlighter('history-not-visited').getStyle?.({portal: {} as never, history: {visited: false, captured: false, scoutControlled: false}})).toMatchObject({
      fillColor: 'red',
      fillOpacity: 1,
    });
  });
});
