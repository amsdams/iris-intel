export function createCirclePolygon(lng: number, lat: number, radiusMeters: number, sides = 12): number[][][] {
    const coords: number[][] = [];
    const km = radiusMeters / 1000;
    const latOffset = km / 111.32;
    const lngOffset = km / (111.32 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < sides; i++) {
        const angle = (i * 360 / sides) * Math.PI / 180;
        coords.push([
            lng + lngOffset * Math.cos(angle),
            lat + latOffset * Math.sin(angle)
        ]);
    }
    coords.push(coords[0]);
    return [coords];
}
