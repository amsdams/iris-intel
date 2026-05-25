import {describe, expect, it} from 'vitest';
import {IRIS_BENCHMARK_SCENARIOS, MINI_BENCHMARK_SCENARIOS, SHARED_BENCHMARK_SCENARIOS} from './benchmark-scenarios';

describe('shared benchmark scenarios', () => {
  it('keeps shared scenarios first for both apps', () => {
    expect(IRIS_BENCHMARK_SCENARIOS.slice(0, SHARED_BENCHMARK_SCENARIOS.length)).toEqual(SHARED_BENCHMARK_SCENARIOS);
    expect(MINI_BENCHMARK_SCENARIOS.slice(0, SHARED_BENCHMARK_SCENARIOS.length)).toEqual(SHARED_BENCHMARK_SCENARIOS);
  });

  it('keeps app-specific isolation rows after shared rows', () => {
    expect(IRIS_BENCHMARK_SCENARIOS.at(-1)?.variant).toBe('no-plugins');
    expect(MINI_BENCHMARK_SCENARIOS.at(-1)?.variant).toBe('no-players');
  });
});
