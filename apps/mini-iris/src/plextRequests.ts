export interface PlextRequestBounds {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
}

export interface PlextRequestMessage extends PlextRequestBounds {
    type: 'IRIS_PLEXTS_REQUEST';
    tab: string;
    minTimestampMs: number;
    maxTimestampMs: number;
    ascendingTimestampOrder?: boolean;
}

export function createPlextRequestMessage(
    tab: string,
    bounds: PlextRequestBounds | null,
    minTimestampMs: number,
    maxTimestampMs = -1,
    ascendingTimestampOrder?: boolean,
): PlextRequestMessage | null {
    if (!bounds) return null;

    return {
        type: 'IRIS_PLEXTS_REQUEST',
        tab,
        minTimestampMs,
        maxTimestampMs,
        ascendingTimestampOrder,
        minLatE6: bounds.minLatE6,
        minLngE6: bounds.minLngE6,
        maxLatE6: bounds.maxLatE6,
        maxLngE6: bounds.maxLngE6,
    };
}
