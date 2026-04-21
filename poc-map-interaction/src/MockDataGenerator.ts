import RBush from 'rbush';
import { Portal, Link, Field } from '@iris/core';

export type Faction = 'E' | 'R' | 'N' | 'M';

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

    addPortal(id: string, team: Faction, lng: number, lat: number, level: number = 0): Portal {
        const existing = this.portals.get(id);
        if (existing) return existing;
        const portal: Portal = { 
            id, 
            team, 
            lng, 
            lat, 
            level,
            health: 100,
            resCount: team === 'N' ? 0 : 8,
            name: `Portal ${id}`
        };
        this.portals.set(id, portal);
        this.neighborMap.set(id, new Set());
        this.index.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id, type: 'portal' });
        return portal;
    }

    addLink(id: string, team: Faction, p1Id: string, p2Id: string): Link | null {
        const p1 = this.portals.get(p1Id);
        const p2 = this.portals.get(p2Id);
        if (!p1 || !p2 || p1.id === p2.id) return null;

        if (p1.team !== team || p2.team !== team) return null;
        if (team === 'N') return null; 

        const linkId = id || [p1.id, p2.id].sort().join('->');
        if (this.linksMap.has(linkId)) return this.linksMap.get(linkId)!;

        const minX = Math.min(p1.lng, p2.lng);
        const minY = Math.min(p1.lat, p2.lat);
        const maxX = Math.max(p1.lng, p2.lng);
        const maxY = Math.max(p1.lat, p2.lat);

        const neighbors = this.index.search({ minX, minY, maxX, maxY });
        for (const item of neighbors) {
            if (item.type === 'link') {
                const other = this.linksMap.get(item.id);
                if (other && this.doSegmentsIntersect(
                    { lng: p1.lng, lat: p1.lat, id: p1.id }, 
                    { lng: p2.lng, lat: p2.lat, id: p2.id },
                    { lng: other.fromLng, lat: other.fromLat, id: other.fromPortalId },
                    { lng: other.toLng, lat: other.toLat, id: other.toPortalId }
                )) return null;
            }
        }

        const link: Link = { 
            id: linkId, 
            team, 
            fromPortalId: p1.id, 
            toPortalId: p2.id,
            fromLat: p1.lat,
            fromLng: p1.lng,
            toLat: p2.lat,
            toLng: p2.lng
        };
        this.linksMap.set(linkId, link);
        this.index.insert({ minX, minY, maxX, maxY, id: linkId, type: 'link' });

        const n1 = this.neighborMap.get(p1Id)!;
        const n2 = this.neighborMap.get(p2Id)!;
        
        n1.forEach(p3Id => {
            if (n2.has(p3Id)) {
                this.addField(`F-${[p1Id, p2Id, p3Id].sort().join('-')}`, team, p1Id, p2Id, p3Id);
            }
        });

        n1.add(p2Id);
        n2.add(p1Id);

        return link;
    }

    private addField(id: string, team: Faction, p1Id: string, p2Id: string, p3Id: string): Field | null {
        if (this.fieldsMap.has(id)) return this.fieldsMap.get(id)!;

        const p1 = this.portals.get(p1Id)!;
        const p2 = this.portals.get(p2Id)!;
        const p3 = this.portals.get(p3Id)!;

        const field: Field = { 
            id, 
            team, 
            points: [
                { portalId: p1.id, lat: p1.lat, lng: p1.lng },
                { portalId: p2.id, lat: p2.lat, lng: p2.lng },
                { portalId: p3.id, lat: p3.lat, lng: p3.lng }
            ]
        };
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

    query(bounds: { minX: number, minY: number, maxX: number, maxY: number }) {
        return this.index.search(bounds);
    }

    isPointInField(p: {lng: number, lat: number}, f: Field): boolean {
        const pts = f.points;
        if (pts.length < 3) return false;
        const a = pts[0], b = pts[1], c = pts[2];
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
        if (Math.abs(val) < 1e-10) return 0; 
        return (val > 0) ? 1 : 2;
    }

    private doSegmentsIntersect(p1: {lng: number, lat: number, id: string}, q1: {lng: number, lat: number, id: string}, p2: {lng: number, lat: number, id: string}, q2: {lng: number, lat: number, id: string}): boolean {
        if (p1.id === p2.id || p1.id === q2.id || q1.id === p2.id || q1.id === q2.id) return false;

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
