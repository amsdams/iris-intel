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
    layer: number;
}

interface EntityIndexItem {
    minX: number; minY: number; maxX: number; maxY: number;
    id: string;
    type: 'portal' | 'link' | 'field';
}

export class MockDataGenerator {
    public portals: Map<string, Portal> = new Map();
    public linksMap: Map<string, Link> = new Map();
    public fieldsMap: Map<string, Field> = new Map();
    private neighborMap: Map<string, Set<string>> = new Map();
    private index = new RBush<EntityIndexItem>();

    get links(): Link[] {
        return Array.from(this.linksMap.values());
    }

    get fields(): Field[] {
        return Array.from(this.fieldsMap.values());
    }

    clear() {
        this.portals.clear();
        this.linksMap.clear();
        this.fieldsMap.clear();
        this.neighborMap.clear();
        this.index.clear();
    }

    addPortal(id: string, faction: Faction, lng: number, lat: number, level: number = 0): Portal {
        const existing = this.portals.get(id);
        if (existing) return existing;
        const portal = { id, faction, lng, lat, level };
        this.portals.set(id, portal);
        this.neighborMap.set(id, new Set());
        this.index.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id, type: 'portal' });
        return portal;
    }

    addLink(_id: string, faction: Faction, p1Id: string, p2Id: string): Link | null {
        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);
        if (!p1 || !p2 || p1.id === p2.id) return null;

        if (p1.faction !== faction || p2.faction !== faction) return null;
        if (faction === 'NEU') return null; // Neutral cannot link, but Machina can

        const linkId = [p1.id, p2.id].sort().join('->');
        if (this.linksMap.has(linkId)) return this.linksMap.get(linkId)!;

        const minX = Math.min(p1.lng, p2.lng);
        const minY = Math.min(p1.lat, p2.lat);
        const maxX = Math.max(p1.lng, p2.lng);
        const maxY = Math.max(p1.lat, p2.lat);

        const neighbors = this.index.search({ minX, minY, maxX, maxY });
        for (const item of neighbors) {
            if (item.type === 'link') {
                const other = this.linksMap.get(item.id);
                if (other && this.doSegmentsIntersect(p1, p2, other.p1, other.p2)) return null;
            }
        }

        const link = { id: linkId, faction, p1, p2 };
        this.linksMap.set(linkId, link);
        this.index.insert({ minX, minY, maxX, maxY, id: linkId, type: 'link' });

        // Triangle Detection (Link-Driven Fields)
        const n1 = this.neighborMap.get(p1Id)!;
        const n2 = this.neighborMap.get(p2Id)!;
        
        n1.forEach(p3Id => {
            if (n2.has(p3Id)) {
                // p1-p3 and p2-p3 already exist. p1-p2 just added. Closed triangle!
                this.addField(`F-${[p1Id, p2Id, p3Id].sort().join('-')}`, faction, p1Id, p2Id, p3Id);
            }
        });

        n1.add(p2Id);
        n2.add(p1Id);

        return link;
    }

    private addField(id: string, faction: Faction, p1Id: string, p2Id: string, p3Id: string): Field | null {
        if (this.fieldsMap.has(id)) return this.fieldsMap.get(id)!;

        const p1 = this.portals.get(p1Id)!;
        const p2 = this.portals.get(p2Id)!;
        const p3 = this.portals.get(p3Id)!;

        // Auto-calculate layer based on nesting
        const center = { lng: (p1.lng + p2.lng + p3.lng) / 3, lat: (p1.lat + p2.lat + p3.lat) / 3 };
        const layer = this.calculateNesting(center);

        const field = { id, faction, p1, p2, p3, layer };
        this.fieldsMap.set(id, field);
        this.index.insert({
            minX: Math.min(p1.lng, p2.lng, p3.lng),
            minY: Math.min(p1.lat, p2.lat, p3.lat),
            maxX: Math.max(p1.lng, p2.lng, p3.lng),
            maxY: Math.max(p1.lat, p2.lat, p3.lat),
            id, type: 'field'
        });
        return field;
    }

    private calculateNesting(p: {lng: number, lat: number}): number {
        let count = 0;
        this.fieldsMap.forEach(f => {
            if (this.isPointInField(p, f)) count++;
        });
        return count;
    }

    query(bounds: { minX: number, minY: number, maxX: number, maxY: number }) {
        return this.index.search(bounds);
    }

    isPointInField(p: {lng: number, lat: number}, f: Field): boolean {
        const a = f.p1, b = f.p2, c = f.p3;
        const det = (b.lat - c.lat) * (a.lng - c.lng) + (c.lng - b.lng) * (a.lat - c.lat);
        const s = ((b.lat - c.lat) * (p.lng - c.lng) + (c.lng - b.lng) * (p.lat - c.lat)) / det;
        const t = ((c.lat - a.lat) * (p.lng - c.lng) + (a.lng - c.lng) * (p.lat - c.lat)) / det;
        const u = 1 - s - t;
        return s >= 0 && t >= 0 && u >= 0;
    }

    private onSegment(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): boolean {
        return q.lng <= Math.max(p.lng, r.lng) && q.lng >= Math.min(p.lng, r.lng) &&
               q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat);
    }

    private getOrientation(p: {lng: number, lat: number}, q: {lng: number, lat: number}, r: {lng: number, lat: number}): number {
        const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
        if (Math.abs(val) < 1e-10) return 0; // Robustness for small numbers
        return (val > 0) ? 1 : 2;
    }

    private doSegmentsIntersect(p1: Portal, q1: Portal, p2: Portal, q2: Portal): boolean {
        // Shared endpoints are never intersections in Ingress
        if (p1.id === p2.id || p1.id === q2.id || q1.id === p2.id || q1.id === q2.id) {
            return false;
        }

        const o1 = this.getOrientation(p1, q1, p2);
        const o2 = this.getOrientation(p1, q1, q2);
        const o3 = this.getOrientation(p2, q2, p1);
        const o4 = this.getOrientation(p2, q2, q1);

        // General case
        if (o1 !== o2 && o3 !== o4) return true;

        // Special Cases (colinear)
        if (o1 === 0 && this.onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && this.onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && this.onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && this.onSegment(p2, q1, q2)) return true;

        return false;
    }
}
