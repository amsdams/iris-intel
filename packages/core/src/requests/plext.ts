import {isFiniteBoundsE6, type BoundsE6} from '../geo-bounds';

export type PlextRequestBounds = BoundsE6;

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

export function shouldReplacePlextWindow(params: { minTimestampMs?: unknown; maxTimestampMs?: unknown } | null | undefined): boolean {
  return params?.minTimestampMs === -1
    && (params.maxTimestampMs === undefined || params.maxTimestampMs === -1);
}

const WORLD_LNG_E6 = 360_000_000;
const HALF_WORLD_LNG_E6 = 180_000_000;

function lngWidthE6(bounds: BoundsE6): number {
  if (bounds.minLngE6 <= bounds.maxLngE6) return bounds.maxLngE6 - bounds.minLngE6;
  return WORLD_LNG_E6 - bounds.minLngE6 + bounds.maxLngE6;
}

function lngCenterE6(bounds: BoundsE6): number {
  const center = bounds.minLngE6 + lngWidthE6(bounds) / 2;
  return center > HALF_WORLD_LNG_E6 ? center - WORLD_LNG_E6 : center;
}

function circularLngDeltaE6(a: number, b: number): number {
  const delta = Math.abs(a - b);
  return Math.min(delta, WORLD_LNG_E6 - delta);
}

function relativeDelta(valueA: number, valueB: number): number {
  const denominator = Math.max(1, Math.max(Math.abs(valueA), Math.abs(valueB)));
  return Math.abs(valueA - valueB) / denominator;
}

export function shouldBypassPlextCooldownForBoundsChange(
  previousBounds: BoundsE6 | null | undefined,
  nextBounds: BoundsE6 | null | undefined,
  options: {moveRatio?: number; spanRatio?: number; minMoveE6?: number} = {},
): boolean {
  if (!nextBounds || !isFiniteBoundsE6(nextBounds)) return false;
  if (!previousBounds || !isFiniteBoundsE6(previousBounds)) return true;

  const moveRatio = options.moveRatio ?? 0.25;
  const spanRatio = options.spanRatio ?? 0.25;
  const minMoveE6 = options.minMoveE6 ?? 1_000;

  const previousLatSpan = Math.max(1, Math.abs(previousBounds.maxLatE6 - previousBounds.minLatE6));
  const nextLatSpan = Math.max(1, Math.abs(nextBounds.maxLatE6 - nextBounds.minLatE6));
  const previousLngSpan = Math.max(1, lngWidthE6(previousBounds));
  const nextLngSpan = Math.max(1, lngWidthE6(nextBounds));

  if (relativeDelta(previousLatSpan, nextLatSpan) >= spanRatio) return true;
  if (relativeDelta(previousLngSpan, nextLngSpan) >= spanRatio) return true;

  const previousLatCenter = (previousBounds.minLatE6 + previousBounds.maxLatE6) / 2;
  const nextLatCenter = (nextBounds.minLatE6 + nextBounds.maxLatE6) / 2;
  const latThreshold = Math.max(minMoveE6, Math.min(previousLatSpan, nextLatSpan) * moveRatio);
  if (Math.abs(nextLatCenter - previousLatCenter) >= latThreshold) return true;

  const lngThreshold = Math.max(minMoveE6, Math.min(previousLngSpan, nextLngSpan) * moveRatio);
  return circularLngDeltaE6(lngCenterE6(previousBounds), lngCenterE6(nextBounds)) >= lngThreshold;
}
