import {describe, expect, it} from 'vitest';
import type {BoundsE6} from '@iris/core';
import {estimateLocationSearchZoom, estimateViewportBounds} from './location-search-viewport';

const phoneViewport = {width: 390, height: 844};

function bounds(
    south: number,
    west: number,
    north: number,
    east: number,
): BoundsE6 {
    return {
        minLatE6: Math.round(south * 1e6),
        minLngE6: Math.round(west * 1e6),
        maxLatE6: Math.round(north * 1e6),
        maxLngE6: Math.round(east * 1e6),
    };
}

function contains(outer: BoundsE6, inner: BoundsE6): boolean {
    return outer.minLatE6 <= inner.minLatE6 &&
        outer.maxLatE6 >= inner.maxLatE6 &&
        outer.minLngE6 <= inner.minLngE6 &&
        outer.maxLngE6 >= inner.maxLngE6;
}

describe('location search viewport helpers', () => {
    it('keeps bounded street results at overview zoom instead of portal zoom', () => {
        const damrakLikeStreet = bounds(52.3724, 4.8929, 52.3772, 4.9022);

        expect(estimateLocationSearchZoom(damrakLikeStreet, phoneViewport)).toBeLessThanOrEqual(14);
    });

    it('still zooms unbounded coordinate searches to a close view', () => {
        expect(estimateLocationSearchZoom(null, phoneViewport)).toBe(15);
    });

    it('sends viewport bounds that cover the searched result bounds', () => {
        const resultBounds = bounds(52.367, 4.88, 52.38, 4.91);
        const zoom = estimateLocationSearchZoom(resultBounds, phoneViewport);
        const viewportBounds = estimateViewportBounds({lat: 52.3735, lng: 4.895}, zoom, phoneViewport);

        expect(contains(viewportBounds, resultBounds)).toBe(true);
    });
});
