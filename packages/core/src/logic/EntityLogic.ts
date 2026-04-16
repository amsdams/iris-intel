import { Field, Link, Portal } from '../store';

/**
 * Service-lite logic for entity relationships and state transitions.
 * This file contains pure business logic that is independent of the Zustand store.
 */

export const EntityLogic = {
    /**
     * Merges a new portal update into an existing portal, detecting if the team has changed.
     * Implements "richer-wins" logic to ensure summary updates don't wipe detailed data.
     */
    mergePortal: (existing: Portal, update: Partial<Portal>): { updated: Portal; teamChanged: boolean; changed: boolean } => {
        const updated: Portal = { ...existing };
        let changed = false;
        let teamChanged = false;

        (Object.keys(update) as (keyof Portal)[]).forEach((key) => {
            const newVal = update[key];
            const oldVal = existing[key];

            if (newVal === undefined || newVal === null) return;

            // Special handling for arrays (mods, resonators, ornaments)
            if (Array.isArray(newVal)) {
                if (!Array.isArray(oldVal) || newVal.length >= (oldVal as unknown[]).length) {
                    (updated as Record<string, unknown>)[key] = newVal;
                    changed = true;
                }
                return;
            }

            // Normal field update
            if (newVal !== oldVal) {
                (updated as Record<string, unknown>)[key] = newVal;
                changed = true;
                if (key === 'team') teamChanged = true;
            }
        });

        return { updated, teamChanged, changed };
    },

    /**
     * Filters out links and fields that are anchored to any of the provided portal IDs.
     */
    calculateCascadingDeletes: (
        portalIds: Set<string>,
        allLinks: Record<string, Link>,
        allFields: Record<string, Field>
    ): { links: Record<string, Link>; fields: Record<string, Field>; changed: boolean } => {
        const links: Record<string, Link> = {};
        let linksChanged = false;
        Object.entries(allLinks).forEach(([id, link]) => {
            if (portalIds.has(link.fromPortalId) || portalIds.has(link.toPortalId)) {
                linksChanged = true;
            } else {
                links[id] = link;
            }
        });

        const fields: Record<string, Field> = {};
        let fieldsChanged = false;
        Object.entries(allFields).forEach(([id, field]) => {
            if (field.points.some((point) => point.portalId && portalIds.has(point.portalId))) {
                fieldsChanged = true;
            } else {
                fields[id] = field;
            }
        });

        return {
            links: linksChanged ? links : allLinks,
            fields: fieldsChanged ? fields : allFields,
            changed: linksChanged || fieldsChanged
        };
    },

    /**
     * Calculates distance between two points in KM.
     */
    getDistKm: (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};
