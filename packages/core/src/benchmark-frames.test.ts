import {describe, expect, it} from 'vitest';
import {
  addFrameDelta,
  aggregateBenchmarkFrameSnapshots,
  createFrameSampleAccumulator,
  finishFrameSample,
  resetFrameSampleAccumulator,
} from './benchmark-frames';

describe('benchmark frame helpers', () => {
  it('accumulates and finishes a frame sample', () => {
    const accumulator = createFrameSampleAccumulator(100);
    addFrameDelta(accumulator, 16, 20);
    addFrameDelta(accumulator, 24, 20);

    expect(finishFrameSample(accumulator, 150, 1_000)).toEqual({
      type: 'frame',
      time: 1_000,
      totalMs: 50,
      frameCount: 2,
      averageFrameMs: 20,
      maxFrameMs: 24,
      slowFrameCount: 1,
      estimatedFps: 50,
    });
  });

  it('resets frame samples', () => {
    const accumulator = createFrameSampleAccumulator(100);
    addFrameDelta(accumulator, 16);
    resetFrameSampleAccumulator(accumulator, 200);

    expect(finishFrameSample(accumulator, 250)).toBe(null);
    expect(accumulator.startedAt).toBe(200);
  });

  it('aggregates benchmark runs with median and weighted average', () => {
    const snapshot = aggregateBenchmarkFrameSnapshots([
      {type: 'frame', time: 1, totalMs: 100, frameCount: 5, averageFrameMs: 20, maxFrameMs: 30, slowFrameCount: 2, estimatedFps: 50},
      {type: 'frame', time: 2, totalMs: 100, frameCount: 10, averageFrameMs: 10, maxFrameMs: 18, slowFrameCount: 0, estimatedFps: 100},
      {type: 'frame', time: 3, totalMs: 100, frameCount: 5, averageFrameMs: 30, maxFrameMs: 40, slowFrameCount: 4, estimatedFps: 33},
    ], {
      variant: 'normal',
      zoom: 14.36,
      mode: 'pan',
      sourceFeatureCounts: {portals: 10},
    });

    expect(snapshot).toMatchObject({
      type: 'frame',
      totalMs: 300,
      frameCount: 20,
      averageFrameMs: 17.5,
      maxFrameMs: 40,
      slowFrameCount: 6,
      estimatedFps: 57,
      benchmarkRunCount: 3,
      benchmarkMedianAverageFrameMs: 20,
      benchmarkMinAverageFrameMs: 10,
      benchmarkMaxAverageFrameMs: 30,
      benchmarkMaxFrameMs: 40,
      benchmarkVariant: 'normal',
      benchmarkZoom: 14.36,
      benchmarkMode: 'pan',
      benchmarkSourceFeatureCounts: {portals: 10},
    });
  });
});
