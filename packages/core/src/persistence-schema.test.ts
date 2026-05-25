import {describe, expect, it} from 'vitest';
import {parseStringChoice, readNestedRecord} from './persistence-schema';

describe('persistence schema helpers', () => {
  it('reads nested records only when every path segment is an object', () => {
    expect(readNestedRecord({state: {mapState: {lat: 52}}}, ['state', 'mapState'])).toEqual({lat: 52});
    expect(readNestedRecord({state: null}, ['state', 'mapState'])).toBeNull();
    expect(readNestedRecord({state: {mapState: []}}, ['state', 'mapState'])).toBeNull();
  });

  it('parses string choices from records, sets, and arrays', () => {
    expect(parseStringChoice<'Dark' | 'Light'>('Dark', {Dark: true, Light: true}, 'Light')).toBe('Dark');
    expect(parseStringChoice<'Dark' | 'Light'>('Other', {Dark: true, Light: true}, 'Dark')).toBe('Dark');
    expect(parseStringChoice<'Dark' | 'Light'>('Dark', new Set<'Dark' | 'Light'>(['Dark']), 'Light')).toBe('Dark');
    expect(parseStringChoice<'Dark' | 'Light'>('Dark', ['Dark'] as const, 'Light')).toBe('Dark');
  });
});
