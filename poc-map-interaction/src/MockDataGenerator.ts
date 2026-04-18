export type Faction = 'ENL' | 'RES' | 'NEU' | 'MAC';

export interface Portal {
    id: string;
    faction: Faction;
    lng: number;
    lat: number;
}

export interface Link {
    id: string;
    faction: Faction;
    p1: Portal;
    p2: Portal;
}

export interface Field {
    id: string;
    faction: Faction;
    p1: Portal;
    p2: Portal;
    p3: Portal;
}

export class MockDataGenerator {
    public portals: Map<string, Portal> = new Map();
    public links: Link[] = [];
    public fields: Field[] = [];

    clear() {
        this.portals.clear();
        this.links = [];
        this.fields = [];
    }

    addPortal(id: string, faction: Faction, lng: number, lat: number): Portal {
        const portal = { id, faction, lng, lat };
        this.portals.set(id, portal);
        return portal;
    }

    addLink(id: string, faction: Faction, p1Id: string, p2Id: string): Link | null {
        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);

        if (!p1 || !p2) {
            console.warn(`Link ${id} rejected: One or both portals not found (${p1Id}, ${p2Id})`);
            return null;
        }

        // 1. Redundancy check (same endpoints)
        const exists = this.links.find(l => 
            (l.p1.id === p1Id && l.p2.id === p2Id) || 
            (l.p1.id === p2Id && l.p2.id === p1Id)
        );
        if (exists) return exists;

        // 2. Intersection Check (O(N) against all existing links)
        for (const other of this.links) {
            if (this.doSegmentsIntersect(p1, p2, other.p1, other.p2)) {
                console.warn(`Link ${id} rejected: Intersects with existing link ${other.id}`);
                return null;
            }
        }

        const link = { id, faction, p1, p2 };
        this.links.push(link);
        return link;
    }

    addField(id: string, faction: Faction, p1Id: string, p2Id: string, p3Id: string): Field | null {
        // Red (MAC) cannot have fields
        if (faction === 'MAC') {
            console.warn(`Field ${id} rejected: MAC faction cannot have fields.`);
            return null;
        }

        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);
        const p3 = this.portals.get(p3Id);

        if (!p1 || !p2 || !p3) return null;

        // Automatically ensure links exist (they will be rejected if they cross)
        this.addLink(`${id}-L12`, faction, p1Id, p2Id);
        this.addLink(`${id}-L23`, faction, p2Id, p3Id);
        this.addLink(`${id}-L31`, faction, p3Id, p1Id);

        const field = { id, faction, p1, p2, p3 };
        this.fields.push(field);
        return field;
    }

    // --- GEOMETRIC MATH ---

    private onSegment(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): boolean {
        return q.lng <= Math.max(p.lng, r.lng) && q.lng >= Math.min(p.lng, r.lng) &&
               q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat);
    }

    private getOrientation(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): number {
        const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
        if (val === 0) return 0; // Collinear
        return (val > 0) ? 1 : 2; // Clockwise or Counter-Clockwise
    }

    private doSegmentsIntersect(p1: Portal, q1: Portal, p2: Portal, q2: Portal): boolean {
        // If they share any endpoint, they are NOT considered to be "crossing" in Ingress
        if (p1.id === p2.id || p1.id === q2.id || q1.id === p2.id || q1.id === q2.id) {
            return false;
        }

        const o1 = this.getOrientation(p1, q1, p2);
        const o2 = this.getOrientation(p1, q1, q2);
        const o3 = this.getOrientation(p2, q2, p1);
        const o4 = this.getOrientation(p2, q2, q1);

        // General case (crossing)
        if (o1 !== o2 && o3 !== o4) return true;

        // Special cases (collinear segments - rare in floating point but good for robustness)
        if (o1 === 0 && this.onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && this.onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && this.onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && this.onSegment(p2, q1, q2)) return true;

        return false;
    }
}
