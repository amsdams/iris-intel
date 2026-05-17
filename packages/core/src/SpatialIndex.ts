import RBush from 'rbush';
import { Portal, Link, Field } from './store';

export type EntityType = 'portal' | 'link' | 'field';

export interface EntityIndexItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    type: EntityType;
}

/**
 * High-performance spatial index for IRIS entities.
 * Wraps RBush to provide viewport-based queries and efficient updates.
 */
export class SpatialIndex {
    private index = new RBush<EntityIndexItem>();
    private tracker = new Map<string, EntityIndexItem>();

    private buildPortalItem(portal: Portal): EntityIndexItem {
        return {
            minX: portal.lng,
            minY: portal.lat,
            maxX: portal.lng,
            maxY: portal.lat,
            id: portal.id,
            type: 'portal'
        };
    }

    private buildLinkItem(link: Link): EntityIndexItem {
        return {
            minX: Math.min(link.fromLng, link.toLng),
            minY: Math.min(link.fromLat, link.toLat),
            maxX: Math.max(link.fromLng, link.toLng),
            maxY: Math.max(link.fromLat, link.toLat),
            id: link.id,
            type: 'link'
        };
    }

    private buildFieldItem(field: Field): EntityIndexItem | null {
        if (field.points.length === 0) return null;

        const lngs = field.points.map(p => p.lng);
        const lats = field.points.map(p => p.lat);
        return {
            minX: Math.min(...lngs),
            minY: Math.min(...lats),
            maxX: Math.max(...lngs),
            maxY: Math.max(...lats),
            id: field.id,
            type: 'field'
        };
    }

    /**
     * Clears the entire index.
     */
    clear(): void {
        this.index.clear();
        this.tracker.clear();
    }

    /**
     * Removes an entity from the index by ID.
     */
    remove(id: string): void {
        const item = this.tracker.get(id);
        if (item) {
            this.index.remove(item);
            this.tracker.delete(id);
        }
    }

    /**
     * Updates or inserts a portal into the index.
     */
    updatePortal(portal: Portal): void {
        this.remove(portal.id);
        const item = this.buildPortalItem(portal);
        this.index.insert(item);
        this.tracker.set(portal.id, item);
    }

    /**
     * Updates or inserts a link into the index.
     */
    updateLink(link: Link): void {
        this.remove(link.id);
        const item = this.buildLinkItem(link);
        this.index.insert(item);
        this.tracker.set(link.id, item);
    }

    /**
     * Updates or inserts a field into the index.
     */
    updateField(field: Field): void {
        this.remove(field.id);
        const item = this.buildFieldItem(field);
        if (!item) return;

        this.index.insert(item);
        this.tracker.set(field.id, item);
    }

    /**
     * Performs a spatial query for entities within the given bounds.
     * @param bounds Geographic bounds {minLat, minLng, maxLat, maxLng}
     */
    query(bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }): EntityIndexItem[] {
        return this.index.search({
            minX: bounds.minLng,
            minY: bounds.minLat,
            maxX: bounds.maxLng,
            maxY: bounds.maxLat
        });
    }

    /**
     * Bulk updates the index from the provided records.
     * Useful for initial hydration or large state changes.
     */
    syncAll(portals: Record<string, Portal>, links: Record<string, Link>, fields: Record<string, Field>): void {
        this.clear();

        const items: EntityIndexItem[] = [
            ...Object.values(portals).map(p => this.buildPortalItem(p)),
            ...Object.values(links).map(l => this.buildLinkItem(l)),
            ...Object.values(fields)
                .map(f => this.buildFieldItem(f))
                .filter((item): item is EntityIndexItem => item !== null),
        ];

        items.forEach(item => this.tracker.set(item.id, item));
        this.index.load(items);
    }
}

// Singleton instance for the core store to use
export const globalSpatialIndex = new SpatialIndex();
