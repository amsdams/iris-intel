import {describe, expect, it} from 'vitest';
import {buildFieldPolygonFeature, buildLinkLineFeatures, buildPortalPointFeature, toFeatureCollection} from './map-features';
import type {Field, Link, Portal} from './store';

describe('map feature builders', () => {
  it('builds portal point features with common entity properties', () => {
    const portal: Portal = {
      id: 'portal-1',
      lat: 52,
      lng: 4,
      team: 'E',
      level: 6,
      health: 80,
    };

    expect(buildPortalPointFeature(portal, {type: 'portal'})).toEqual({
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [4, 52]},
      properties: {
        id: 'portal-1',
        team: 'E',
        level: 6,
        health: 80,
        type: 'portal',
      },
    });
  });

  it('builds antimeridian-safe link line features', () => {
    const link: Link = {
      id: 'link-1',
      team: 'R',
      fromPortalId: 'a',
      fromLat: 10,
      fromLng: 179,
      toPortalId: 'b',
      toLat: 12,
      toLng: -179,
    };

    const features = buildLinkLineFeatures(link, {type: 'link'});

    expect(features).toHaveLength(2);
    expect(features[0].id).toBe('link-1');
    expect(features[1].id).toBe('link-1:1');
    expect(features[0].properties).toEqual({id: 'link-1', team: 'R', type: 'link'});
  });

  it('builds antimeridian-safe field polygon features', () => {
    const field: Field = {
      id: 'field-1',
      team: 'M',
      points: [
        {lat: -43.9510, lng: -176.5606},
        {lat: -40.4108, lng: 176.6182},
        {lat: -43.8159, lng: -176.4732},
      ],
    };

    const feature = buildFieldPolygonFeature(field, {type: 'field'});

    expect(feature.id).toBe('field-1');
    expect(feature.geometry.type).toBe('MultiPolygon');
    expect(feature.properties).toEqual({id: 'field-1', team: 'M', type: 'field'});
  });

  it('wraps features into a FeatureCollection', () => {
    expect(toFeatureCollection([])).toEqual({type: 'FeatureCollection', features: []});
  });
});
