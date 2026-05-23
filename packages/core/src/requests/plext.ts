export interface PlextRequestBounds {
  minLatE6: number;
  minLngE6: number;
  maxLatE6: number;
  maxLngE6: number;
}

export interface PlextRequestMessage extends Partial<PlextRequestBounds> {
  type: 'IRIS_PLEXTS_REQUEST';
  tab: string;
  minTimestampMs: number;
  maxTimestampMs: number;
  ascendingTimestampOrder?: boolean;
  force?: boolean;
}

export interface CreatePlextRequestMessageOptions {
  tab: string;
  bounds?: PlextRequestBounds | null;
  minTimestampMs?: number;
  maxTimestampMs?: number;
  ascendingTimestampOrder?: boolean;
  force?: boolean;
  requireBounds?: boolean;
}

export function createPlextRequestMessage(options: CreatePlextRequestMessageOptions): PlextRequestMessage | null {
  if (options.requireBounds && !options.bounds) return null;

  return {
    type: 'IRIS_PLEXTS_REQUEST',
    tab: options.tab,
    minTimestampMs: options.minTimestampMs ?? -1,
    maxTimestampMs: options.maxTimestampMs ?? -1,
    ...(options.ascendingTimestampOrder !== undefined ? { ascendingTimestampOrder: options.ascendingTimestampOrder } : {}),
    ...(options.bounds ? {
      minLatE6: options.bounds.minLatE6,
      minLngE6: options.bounds.minLngE6,
      maxLatE6: options.bounds.maxLatE6,
      maxLngE6: options.bounds.maxLngE6,
    } : {}),
    ...(options.force ? { force: true } : {}),
  };
}
