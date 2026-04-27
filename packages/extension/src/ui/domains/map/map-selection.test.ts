import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {resolveMapSelection} from './map-selection';
import {globalSpatialIndex} from '@iris/core';
import type {Portal} from '@iris/core';

function makeProject(scale = 100): (lng: number, lat: number) => {x: number; y: number} {
  return (lng: number, lat: number) => ({
    x: lng * scale,
    y: lat * scale,
  });
}

function makePortal(id: string, lng: number, lat: number): Portal {
  return {
    id,
    lng,
    lat,
    team: 'N',
  };
}

function fillIndex(portals: Record<string, Portal>): void {
  globalSpatialIndex.clear();
  globalSpatialIndex.syncAll(portals, {}, {});
}

describe('resolveMapSelection fast path', () => {
  beforeEach(() => {
    globalSpatialIndex.clear();
  });

  afterEach(() => {
    globalSpatialIndex.clear();
  });

  it('uses the spatial index when the portal set is large', () => {
    const portals: Record<string, Portal> = {};

    for (let i = 0; i < 450; i += 1) {
      portals[`far-${i}`] = makePortal(`far-${i}`, 20 + i, 20 + i);
    }
    portals.target = makePortal('target', 1.0004, 1.0004);

    fillIndex(portals);

    const result = resolveMapSelection({
      portals,
      fields: {},
      point: {x: 100.04, y: 100.04},
      lng: 1.0004,
      lat: 1.0004,
      zoom: 16,
      project: makeProject(100),
    });

    expect(result).toEqual({portalId: 'target', reason: 'portal'});
  });
});

describe('resolveMapSelection', () => {
  beforeEach(() => {
    globalSpatialIndex.clear();
  });

  afterEach(() => {
    globalSpatialIndex.clear();
  });

  it('prefers the nearest portal hit', () => {
    fillIndex({
      a: makePortal('a', 1, 1),
      b: makePortal('b', 2, 2),
    });

    const result = resolveMapSelection({
      portals: {
        a: makePortal('a', 1, 1),
        b: makePortal('b', 2, 2),
      },
      fields: {},
      point: {x: 100.5, y: 100.5},
      lng: 1.004,
      lat: 1.004,
      zoom: 12,
      project: makeProject(),
    });

    expect(result).toEqual({portalId: 'a', reason: 'portal'});
  });

  it('returns null when no portal is within range', () => {
    fillIndex({
      a: makePortal('a', 1, 1),
      b: makePortal('b', 5, 5),
    });

    const result = resolveMapSelection({
      portals: {
        a: makePortal('a', 1, 1),
        b: makePortal('b', 5, 5),
      },
      fields: {},
      point: {x: 400, y: 400},
      lng: 10,
      lat: 10,
      zoom: 12,
      project: makeProject(),
    });

    expect(result).toBeNull();
  });

  it('detects when a point is inside a field', () => {
    const fieldId = 'test-field';
    const fields = {
      [fieldId]: {
        id: fieldId,
        team: 'E',
        points: [
          {lng: 0, lat: 0},
          {lng: 2, lat: 0},
          {lng: 1, lat: 2},
        ],
      },
    };

    const result = resolveMapSelection({
      portals: {},
      fields,
      point: {x: 100, y: 50},
      lng: 1,
      lat: 0.5,
      zoom: 12,
      project: makeProject(),
    });

    expect(result).toEqual({fieldId, reason: 'field'});
  });
});
