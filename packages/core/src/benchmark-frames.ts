export interface FrameSampleAccumulator {
  startedAt: number;
  frameCount: number;
  totalFrameMs: number;
  maxFrameMs: number;
  slowFrameCount: number;
}

export interface FrameSampleSnapshot {
  type: 'frame';
  time: number;
  totalMs: number;
  frameCount: number;
  averageFrameMs: number;
  maxFrameMs: number;
  slowFrameCount: number;
  estimatedFps: number;
}

export interface BenchmarkFrameSnapshot extends FrameSampleSnapshot {
  benchmarkRunCount: number;
  benchmarkMedianAverageFrameMs: number;
  benchmarkMinAverageFrameMs: number;
  benchmarkMaxAverageFrameMs: number;
  benchmarkMaxFrameMs: number;
  benchmarkVariant?: string;
  benchmarkZoom?: number;
  benchmarkMode?: string;
  benchmarkSourceFeatureCounts?: Record<string, number>;
  benchmarkPluginFeatureCounts?: Record<string, number>;
}

export interface BenchmarkFrameMetadata {
  variant?: string;
  zoom?: number;
  mode?: string;
  sourceFeatureCounts?: Record<string, number>;
  pluginFeatureCounts?: Record<string, number>;
}

export function createFrameSampleAccumulator(startedAt = 0): FrameSampleAccumulator {
  return {
    startedAt,
    frameCount: 0,
    totalFrameMs: 0,
    maxFrameMs: 0,
    slowFrameCount: 0,
  };
}

export function resetFrameSampleAccumulator(accumulator: FrameSampleAccumulator, startedAt: number): void {
  accumulator.startedAt = startedAt;
  accumulator.frameCount = 0;
  accumulator.totalFrameMs = 0;
  accumulator.maxFrameMs = 0;
  accumulator.slowFrameCount = 0;
}

export function addFrameDelta(
  accumulator: FrameSampleAccumulator,
  frameMs: number,
  slowFrameMs = 20,
): void {
  if (!Number.isFinite(frameMs) || frameMs <= 0) return;

  accumulator.frameCount += 1;
  accumulator.totalFrameMs += frameMs;
  accumulator.maxFrameMs = Math.max(accumulator.maxFrameMs, frameMs);
  if (frameMs >= slowFrameMs) {
    accumulator.slowFrameCount += 1;
  }
}

export function finishFrameSample(
  accumulator: FrameSampleAccumulator,
  finishedAt: number,
  wallTime = Date.now(),
): FrameSampleSnapshot | null {
  if (accumulator.frameCount === 0) return null;

  const averageFrameMs = accumulator.totalFrameMs / accumulator.frameCount;
  return {
    type: 'frame',
    time: wallTime,
    totalMs: finishedAt - accumulator.startedAt,
    frameCount: accumulator.frameCount,
    averageFrameMs,
    maxFrameMs: accumulator.maxFrameMs,
    slowFrameCount: accumulator.slowFrameCount,
    estimatedFps: Math.round(1000 / averageFrameMs),
  };
}

export function aggregateBenchmarkFrameSnapshots(
  snapshots: FrameSampleSnapshot[],
  metadata: BenchmarkFrameMetadata = {},
): BenchmarkFrameSnapshot | null {
  const averageValues = snapshots
    .map((snapshot) => snapshot.averageFrameMs)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (averageValues.length === 0) return null;

  const middle = Math.floor(averageValues.length / 2);
  const medianAverageFrameMs = averageValues.length % 2 === 0
    ? (averageValues[middle - 1] + averageValues[middle]) / 2
    : averageValues[middle];
  const totalFrameCount = snapshots.reduce((total, snapshot) => total + snapshot.frameCount, 0);
  const totalFrameMs = snapshots.reduce(
    (total, snapshot) => total + (snapshot.averageFrameMs * snapshot.frameCount),
    0,
  );
  const averageFrameMs = totalFrameCount > 0 ? totalFrameMs / totalFrameCount : medianAverageFrameMs;

  return {
    type: 'frame',
    time: Date.now(),
    totalMs: snapshots.reduce((total, item) => total + item.totalMs, 0),
    frameCount: totalFrameCount,
    averageFrameMs,
    maxFrameMs: Math.max(...snapshots.map((item) => item.maxFrameMs)),
    slowFrameCount: snapshots.reduce((total, item) => total + item.slowFrameCount, 0),
    estimatedFps: Math.round(1000 / averageFrameMs),
    benchmarkRunCount: snapshots.length,
    benchmarkMedianAverageFrameMs: medianAverageFrameMs,
    benchmarkMinAverageFrameMs: averageValues[0],
    benchmarkMaxAverageFrameMs: averageValues[averageValues.length - 1],
    benchmarkMaxFrameMs: Math.max(...snapshots.map((item) => item.maxFrameMs)),
    benchmarkVariant: metadata.variant,
    benchmarkZoom: metadata.zoom,
    benchmarkMode: metadata.mode,
    benchmarkSourceFeatureCounts: metadata.sourceFeatureCounts ? {...metadata.sourceFeatureCounts} : undefined,
    benchmarkPluginFeatureCounts: metadata.pluginFeatureCounts ? {...metadata.pluginFeatureCounts} : undefined,
  };
}
