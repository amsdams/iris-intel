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

export function formatMU(val: number): string {
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toString();
}

export function debounce<T extends (...args: never[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;
    return (...args: Parameters<T>): void => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout((): void => { fn(...args); }, delay);
    };
}

export function throttle<T extends (...args: never[]) => unknown>(fn: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>): void => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout((): void => { inThrottle = false; }, limit);
        }
    };
}
