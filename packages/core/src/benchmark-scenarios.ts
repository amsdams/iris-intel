export type SharedBenchmarkVariant = 'normal' | 'base' | 'no-links' | 'no-fields';
export type IrisBenchmarkVariant = SharedBenchmarkVariant | 'no-plugins';
export type MiniBenchmarkVariant = SharedBenchmarkVariant | 'no-players';
export type BenchmarkMode = 'pan' | 'zoom';
export type BenchmarkZoom = 8 | 12 | 14.36 | 16;

export interface BenchmarkScenario<Variant extends string = SharedBenchmarkVariant> {
  label: string;
  variant: Variant;
  zoom: BenchmarkZoom;
  mode: BenchmarkMode;
}

export const SHARED_BENCHMARK_SCENARIOS: readonly BenchmarkScenario<SharedBenchmarkVariant>[] = [
  {label: 'z14.36 normal pan', variant: 'normal', zoom: 14.36, mode: 'pan'},
  {label: 'z14.36 base pan', variant: 'base', zoom: 14.36, mode: 'pan'},
  {label: 'z14.36 normal zoom', variant: 'normal', zoom: 14.36, mode: 'zoom'},
  {label: 'z8 normal pan', variant: 'normal', zoom: 8, mode: 'pan'},
  {label: 'z8 no-links pan', variant: 'no-links', zoom: 8, mode: 'pan'},
  {label: 'z8 no-fields pan', variant: 'no-fields', zoom: 8, mode: 'pan'},
  {label: 'z8 base pan', variant: 'base', zoom: 8, mode: 'pan'},
] as const;

export const IRIS_BENCHMARK_EXTRA_SCENARIOS: readonly BenchmarkScenario<IrisBenchmarkVariant>[] = [
  {label: 'z14.36 no-plugins pan', variant: 'no-plugins', zoom: 14.36, mode: 'pan'},
  {label: 'z14.36 no-plugins zoom', variant: 'no-plugins', zoom: 14.36, mode: 'zoom'},
  {label: 'z8 no-plugins pan', variant: 'no-plugins', zoom: 8, mode: 'pan'},
] as const;

export const MINI_BENCHMARK_EXTRA_SCENARIOS: readonly BenchmarkScenario<MiniBenchmarkVariant>[] = [
  {label: 'z14.36 no-players pan', variant: 'no-players', zoom: 14.36, mode: 'pan'},
  {label: 'z8 no-players pan', variant: 'no-players', zoom: 8, mode: 'pan'},
] as const;

export const IRIS_BENCHMARK_SCENARIOS: readonly BenchmarkScenario<IrisBenchmarkVariant>[] = [
  ...SHARED_BENCHMARK_SCENARIOS,
  ...IRIS_BENCHMARK_EXTRA_SCENARIOS,
];

export const MINI_BENCHMARK_SCENARIOS: readonly BenchmarkScenario<MiniBenchmarkVariant>[] = [
  ...SHARED_BENCHMARK_SCENARIOS,
  ...MINI_BENCHMARK_EXTRA_SCENARIOS,
];
