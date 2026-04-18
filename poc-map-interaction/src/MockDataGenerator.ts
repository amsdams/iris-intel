import RBush from 'rbush';

export type Faction = 'ENL' | 'RES' | 'NEU' | 'MAC';

export interface Portal {
    id: string;
    faction: Faction;
    lng: number;
    lat: number;
    level: number; // 0-8
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

interface EntityIndexItem {
    minX: number; minY: number; maxX: number; maxY: number;
    id: string;
    type: 'portal' | 'link' | 'field';
}

export class MockDataGenerator {
    public portals: Map<string, Portal> = new Map();
    public links: Link[] = [];
    public fields: Field[] = [];
    private index = new RBush<EntityIndexItem>();

    clear() {
        this.portals.clear();
        this.links = [];
        this.fields = [];
        this.index.clear();
    }

    addPortal(id: string, faction: Faction, lng: number, lat: number, level: number = 0): Portal {
        const portal = { id, faction, lng, lat, level };
        this.portals.set(id, portal);
        this.index.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id, type: 'portal' });
        return portal;
    }

    addLink(id: string, faction: Faction, p1Id: string, p2Id: string): Link | null {
        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);
        if (!p1 || !p2 || p1.id === p2.id) return null;

        const exists = this.links.find(l => (l.p1.id === p1Id && l.p2.id === p2Id) || (l.p1.id === p2Id && l.p2.id === p1Id));
        if (exists) return exists;

        const minX = Math.min(p1.lng, p2.lng);
        const minY = Math.min(p1.lat, p2.lat);
        const maxX = Math.max(p1.lng, p2.lng);
        const maxY = Math.max(p1.lat, p2.lat);

        const neighbors = this.index.search({ minX, minY, maxX, maxY });
        for (const item of neighbors) {
            if (item.type === 'link') {
                const other = this.links.find(l => l.id === item.id);
                if (other && this.doSegmentsIntersect(p1, p2, other.p1, other.p2)) return null;
            }
        }

        const link = { id, faction, p1, p2 };
        this.links.push(link);
        this.index.insert({ minX, minY, maxX, maxY, id, type: 'link' });
        return link;
    }

    addField(id: string, faction: Faction, p1Id: string, p2Id: string, p3Id: string): Field | null {
        if (faction === 'MAC') return null;
        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);
        const p3 = this.portals.get(p3Id);
        if (!p1 || !p2 || p3 === undefined) return null; // Simplified check

        const L12 = this.addLink(`${id}-L12`, faction, p1Id, p2Id);
        const L23 = this.addLink(`${id}-L23`, faction, p2Id, p3Id);
        const L31 = this.addLink(`${id}-L31`, faction, p3Id, p1Id);
        if (!L12 || !L23 || !L31) return null;

        const field = { id, faction, p1, p2, p3 };
        this.fields.push(field);
        this.index.insert({
            minX: Math.min(p1.lng, p2.lng, p3.lng),
            minY: Math.min(p1.lat, p2.lat, p3.lat),
            maxX: Math.max(p1.lng, p2.lng, p3.lng),
            maxY: Math.max(p1.lat, p2.lat, p3.lat),
            id, type: 'field'
        });
        return field;
    }

    query(bounds: { minX: number, minY: number, maxX: number, maxY: number }) {
        return this.index.search(bounds);
    }

    private onSegment(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): boolean {
        return q.lng <= Math.max(p.lng, r.lng) && q.lng >= Math.min(p.lng, r.lng) &&
               q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat);
    }

    private getOrientation(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): number {
        const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
        if (val === 0) return 0;
        return (val > 0) ? 1 : 2;
    }

    private doSegmentsIntersect(p1: Portal, q1: Portal, p2: Portal, q2: Portal): boolean {
        if (p1.id === p2.id || p1.id === q2.id || q1.id === p2.id || q1.id === q2.id) {
            return false;
        }
        const o1 = this.getOrientation(p1, q1, p2);
        const o2 = this.getOrientation(p1, q1, q2);
        const o3 = this.getOrientation(p2, q2, p1);
        const o4 = this.getOrientation(p2, q2, q1);
        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && this.onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && this.onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && this.onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && this.onSegment(p2, q1, q2)) return true;
        return false;
    }
}
