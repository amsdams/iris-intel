import {describe, expect, it} from 'vitest';
import {Field, Link, Portal} from './store';
import {SpatialIndex} from './SpatialIndex';

function makePortal(id: string, lat: number, lng: number): Portal {
    return {
        id,
        lat,
        lng,
        team: 'E',
    };
}

function makeLink(id: string, from: Portal, to: Portal): Link {
    return {
        id,
        team: 'E',
        fromPortalId: from.id,
        fromLat: from.lat,
        fromLng: from.lng,
        toPortalId: to.id,
        toLat: to.lat,
        toLng: to.lng,
    };
}

function makeField(id: string, points: Portal[]): Field {
    return {
        id,
        team: 'E',
        points: points.map((point) => ({
            portalId: point.id,
            lat: point.lat,
            lng: point.lng,
        })),
    };
}

describe('SpatialIndex', () => {
    it('bulk loads portals, links, and fields with queryable bounds', () => {
        const index = new SpatialIndex();
        const portalA = makePortal('portal-a', 1, 1);
        const portalB = makePortal('portal-b', 2, 2);
        const portalC = makePortal('portal-c', 1, 3);
        const link = makeLink('link-a-b', portalA, portalB);
        const field = makeField('field-a-b-c', [portalA, portalB, portalC]);

        index.syncAll(
            {
                [portalA.id]: portalA,
                [portalB.id]: portalB,
                [portalC.id]: portalC,
            },
            {[link.id]: link},
            {[field.id]: field}
        );

        const ids = index.query({
            minLat: 0.5,
            minLng: 0.5,
            maxLat: 2.5,
            maxLng: 3.5,
        }).map((item) => item.id);

        expect(ids).toEqual(expect.arrayContaining([
            'portal-a',
            'portal-b',
            'portal-c',
            'link-a-b',
            'field-a-b-c',
        ]));
    });

    it('supports incremental remove and update after bulk load', () => {
        const index = new SpatialIndex();
        const portalA = makePortal('portal-a', 1, 1);
        const portalB = makePortal('portal-b', 2, 2);

        index.syncAll({[portalA.id]: portalA, [portalB.id]: portalB}, {}, {});
        index.remove('portal-a');
        index.updatePortal({...portalB, lat: 8, lng: 8});

        const originalAreaIds = index.query({
            minLat: 0,
            minLng: 0,
            maxLat: 3,
            maxLng: 3,
        }).map((item) => item.id);
        const movedAreaIds = index.query({
            minLat: 7,
            minLng: 7,
            maxLat: 9,
            maxLng: 9,
        }).map((item) => item.id);

        expect(originalAreaIds).not.toContain('portal-a');
        expect(originalAreaIds).not.toContain('portal-b');
        expect(movedAreaIds).toEqual(['portal-b']);
    });
});
