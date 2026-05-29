import {describe, expect, it} from 'vitest';
import {
  getVisiblePortalOrnaments,
  estimateFieldMindUnits,
  formatDistanceKm,
  isFieldVisibleForDisplay,
  isLinkVisibleForDisplay,
  isPortalVisibleForDisplay,
  shouldRenderArtifactFeature,
  type PortalVisibilityFilters,
} from './entity-display';
import type {Artifact, Field, Link, Portal} from './store';

const filters: PortalVisibilityFilters = {
  showResistance: true,
  showEnlightened: true,
  showMachina: false,
  showUnclaimedPortals: true,
  showLevel: {1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true},
  showHealth: {25: true, 50: true, 75: true, 100: true},
  showVisited: 'ALL',
  showCaptured: 'ALL',
  showScanned: 'ALL',
};

describe('entity display helpers', () => {
  it('applies portal team, level, health, and history filters', () => {
    const portal: Portal = {id: 'p1', lat: 52, lng: 4, team: 'M', level: 8, health: 80};
    expect(isPortalVisibleForDisplay(portal, filters)).toBe(false);
    expect(isPortalVisibleForDisplay(portal, filters, {selectedPortalId: 'p1'})).toBe(true);
    expect(isPortalVisibleForDisplay({...portal, team: 'E'}, {...filters, showLevel: {...filters.showLevel, 8: false}})).toBe(false);
  });

  it('applies link and field team visibility', () => {
    const link: Link = {id: 'l1', team: 'R', fromPortalId: 'a', toPortalId: 'b', fromLat: 1, fromLng: 2, toLat: 3, toLng: 4};
    const field: Field = {id: 'f1', team: 'R', points: []};
    expect(isLinkVisibleForDisplay(link, {...filters, showLinks: true})).toBe(true);
    expect(isLinkVisibleForDisplay(link, {...filters, showLinks: false})).toBe(false);
    expect(isFieldVisibleForDisplay(field, {...filters, showFields: true, showResistance: false})).toBe(false);
  });

  it('classifies artifact and ornament feature visibility', () => {
    const artifact: Artifact = {portalId: 'p1', type: 'shard', ids: ['s1']};
    const portal: Portal = {id: 'p1', lat: 52, lng: 4, team: 'E', ornaments: ['event']};
    expect(shouldRenderArtifactFeature(artifact, portal, true)).toBe(true);
    expect(shouldRenderArtifactFeature({...artifact, lat: 52, lng: 4}, undefined, true)).toBe(true);
    expect(shouldRenderArtifactFeature(artifact, portal, false)).toBe(false);
    expect(getVisiblePortalOrnaments(portal, {'p1': ['mock']}, true)).toEqual(['event', 'mock']);
    expect(getVisiblePortalOrnaments(portal, {'p1': ['mock']}, false)).toEqual([]);
  });

  it('estimates field MU with the shared rough area heuristic', () => {
    const field: Field = {
      id: 'f1',
      team: 'E',
      points: [
        {lat: 0, lng: 0},
        {lat: 0, lng: 0.01},
        {lat: 0.01, lng: 0},
      ],
    };
    expect(estimateFieldMindUnits(field)).toBe(50);
    expect(estimateFieldMindUnits({points: []})).toBe(0);
  });

  it('formats distances in precise and compact app display modes', () => {
    expect(formatDistanceKm(0)).toBe('0m');
    expect(formatDistanceKm(0.123)).toBe('123m');
    expect(formatDistanceKm(1.234)).toBe('1.23km');
    expect(formatDistanceKm(1.234, {compact: true})).toBe('1.2km');
    expect(formatDistanceKm(12.34, {compact: true})).toBe('12km');
  });
});
