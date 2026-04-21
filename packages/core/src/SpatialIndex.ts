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
        const item: EntityIndexItem = {
            minX: portal.lng,
            minY: portal.lat,
            maxX: portal.lng,
            maxY: portal.lat,
            id: portal.id,
            type: 'portal'
        };
        this.index.insert(item);
        this.tracker.set(portal.id, item);
    }

    /**
     * Updates or inserts a link into the index.
     */
    updateLink(link: Link): void {
        this.remove(link.id);
        const item: EntityIndexItem = {
            minX: Math.min(link.fromLng, link.toLng),
            minY: Math.min(link.fromLat, link.toLat),
            maxX: Math.max(link.fromLng, link.toLng),
            maxY: Math.max(link.fromLat, link.toLat),
            id: link.id,
            type: 'link'
        };
        this.index.insert(item);
        this.tracker.set(link.id, item);
    }

    /**
     * Updates or inserts a field into the index.
     */
    updateField(field: Field): void {
        this.remove(field.id);
        const lngs = field.points.map(p => p.lng);
        const lats = field.points.map(p => p.lat);
        const item: EntityIndexItem = {
            minX: Math.min(...lngs),
            minY: Math.min(...lats),
            maxX: Math.max(...lngs),
            maxY: Math.max(...lats),
            id: field.id,
            type: 'field'
        };
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
        Object.values(portals).forEach(p => this.updatePortal(p));
        Object.values(links).forEach(l => this.updateLink(l));
        Object.values(fields).forEach(f => this.updateField(f));
    }
}

// Singleton instance for the core store to use
export const globalSpatialIndex = new SpatialIndex();
