import { h, JSX } from 'preact';
import { ENTITY_REQUEST_BATCH_SIZE, IRIS_BENCHMARK_SCENARIOS, buildEntityRequestPayload, useStore, type BenchmarkMode, type BenchmarkScenario, type BenchmarkZoom, type IrisBenchmarkVariant } from '@iris/core';
import { useRenderDiagnostics } from './useRenderDiagnostics';
import { useState } from 'preact/hooks';

interface MockToolAction {
    label: string;
    loadTitle: string;
    clearTitle: string;
    loadType: string;
    clearType: string;
    active: boolean;
}

const MOCK_INVENTORY_GUID_PATTERN = /^(xmp|reso|ultra|pc|shield|heat-sink|transmuter|key|ada|jarvis|fracker|battle-beacon|apex|hypercube|drone|entitlement|capsule)-/;
const MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX = 'mock-player-activity:';
const BENCHMARK_VARIANTS = [
    {label: 'Normal', value: 'normal'},
    {label: 'Base', value: 'base'},
    {label: 'No Plugins', value: 'no-plugins'},
    {label: 'No Links', value: 'no-links'},
    {label: 'No Fields', value: 'no-fields'},
] as const;
const BENCHMARK_ZOOMS = [
    {label: 'Z8', value: 8},
    {label: 'Z12', value: 12},
    {label: 'Z14.36', value: 14.36},
    {label: 'Z16', value: 16},
] as const;
const BENCHMARK_MODES = [
    {label: 'Pan', value: 'pan'},
    {label: 'Zoom', value: 'zoom'},
] as const;

type BenchmarkVariant = IrisBenchmarkVariant;
type BenchmarkBatchCase = BenchmarkScenario<IrisBenchmarkVariant>;

const BENCHMARK_BATCH: readonly BenchmarkBatchCase[] = IRIS_BENCHMARK_SCENARIOS;

const BENCHMARK_BATCH_TIMEOUT_MS = 45_000;
const BENCHMARK_BATCH_POLL_MS = 250;
const BENCHMARK_PRELOAD_MOVE_SETTLE_MS = 3_600;
const BENCHMARK_PRELOAD_TIMEOUT_MS = 25_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function formatCount(value: number | undefined): string {
    return typeof value === 'number' ? value.toLocaleString() : '-';
}

function formatMs(value: number | undefined): string {
    return typeof value === 'number' ? `${Math.round(value)}ms` : '-';
}

function formatPluginCounts(counts: Record<string, number> | undefined): string {
    if (!counts) return 'pluginMix -';
    return `pluginMix total ${formatCount(counts.total)} labels ${formatCount(counts.labels)} player ${formatCount(counts.playerMarkers)} highlights ${formatCount(counts.highlights)} lines ${formatCount(counts.lines)} points ${formatCount(counts.points)}`;
}

function buildBatchReportLine(testCase: BenchmarkBatchCase): string {
    const state = useStore.getState();
    const viewport = state.mapPerfDiagnostics.viewport;
    const frame = state.mapPerfDiagnostics.frame;

    if (!frame) {
        return `${testCase.label}: FRAME no sample`;
    }
    const sourceCounts = frame.benchmarkSourceFeatureCounts ?? viewport?.sourceFeatureCounts ?? {};
    const pluginCounts = frame.benchmarkPluginFeatureCounts ?? viewport?.pluginFeatureCounts;
    const itemCount = (sourceCounts.portals ?? viewport?.portalCount ?? 0) +
        (sourceCounts.links ?? viewport?.linkCount ?? 0) +
        (sourceCounts.fields ?? viewport?.fieldCount ?? 0) +
        (sourceCounts.artifacts ?? viewport?.artifactCount ?? 0) +
        (sourceCounts.ornaments ?? viewport?.ornamentCount ?? 0) +
        (sourceCounts['plugin-features'] ?? viewport?.pluginCount ?? 0);

    return [
        testCase.label,
        `items ${formatCount(itemCount)}`,
        `P ${formatCount(sourceCounts.portals ?? viewport?.portalCount)}`,
        `L ${formatCount(sourceCounts.links ?? viewport?.linkCount)}`,
        `F ${formatCount(sourceCounts.fields ?? viewport?.fieldCount)}`,
        `orn ${formatCount(sourceCounts.ornaments ?? viewport?.ornamentCount)}`,
        `plugin ${formatCount(sourceCounts['plugin-features'] ?? viewport?.pluginCount)}`,
        `sources P ${formatCount(sourceCounts.portals)} L ${formatCount(sourceCounts.links)} F ${formatCount(sourceCounts.fields)}`,
        `avg ${formatMs(frame.averageFrameMs)}`,
        `max ${formatMs(frame.maxFrameMs)}`,
        `fps ${formatCount(frame.estimatedFps)}`,
        `slow ${formatCount(frame.slowFrameCount)}/${formatCount(frame.frameCount)}`,
        `median ${formatMs(frame.benchmarkMedianAverageFrameMs)}`,
        `benchMax ${formatMs(frame.benchmarkMaxFrameMs)}`,
        formatPluginCounts(pluginCounts),
    ].join(' | ');
}

async function waitForBenchmarkResult(testCase: BenchmarkBatchCase, startedAt: number): Promise<void> {
    const deadline = Date.now() + BENCHMARK_BATCH_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const frame = useStore.getState().mapPerfDiagnostics.frame;
        if (
            frame &&
            frame.time >= startedAt &&
            frame.benchmarkVariant === testCase.variant &&
            frame.benchmarkMode === testCase.mode &&
            Math.abs((frame.benchmarkZoom ?? 0) - testCase.zoom) < 0.01
        ) {
            return;
        }
        await sleep(BENCHMARK_BATCH_POLL_MS);
    }

    throw new Error(`Timed out waiting for ${testCase.label}`);
}

function buildPreloadSummary(zoom: BenchmarkZoom, timedOut: boolean): string {
    const state = useStore.getState();
    const bounds = state.mapState.bounds;
    const payload = bounds ? buildEntityRequestPayload(bounds, zoom) : null;
    const entities = state.endpointDiagnostics.entities;
    const tileCount = payload?.tileKeys.length ?? 0;
    const batchCount = Math.ceil(tileCount / ENTITY_REQUEST_BATCH_SIZE);

    return [
        `request tiles ${formatCount(tileCount)}`,
        `batches ${formatCount(batchCount)}`,
        `dataZoom ${formatCount(payload?.dataZoom)}`,
        `loaded P ${formatCount(Object.keys(state.portals).length)}`,
        `L ${formatCount(Object.keys(state.links).length)}`,
        `F ${formatCount(Object.keys(state.fields).length)}`,
        `diagnostic ${payload?.diagnostic ?? 'none'}`,
        `skip ${entities.lastSkipReason ?? 'none'}`,
        timedOut ? 'timeout yes' : 'timeout no',
    ].join(' ');
}

async function preloadBenchmarkZoom(zoom: BenchmarkZoom): Promise<string> {
    const state = useStore.getState();
    const { lat, lng } = state.mapState;
    const startedAt = Date.now();

    state.clearMapEntities();
    window.postMessage({ type: 'IRIS_MOVE_MAP', center: { lat, lng }, zoom }, '*');
    await sleep(BENCHMARK_PRELOAD_MOVE_SETTLE_MS);
    window.postMessage({ type: 'IRIS_REFRESH_CURRENT_VIEW', reason: 'manual' }, '*');

    const deadline = Date.now() + BENCHMARK_PRELOAD_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const entities = useStore.getState().endpointDiagnostics.entities;
        const hasObservedRefresh =
            (entities.lastSuccessAt !== null && entities.lastSuccessAt >= startedAt) ||
            (entities.lastRequestAt !== null && entities.lastRequestAt >= startedAt && entities.lastSkipReason !== null);
        if (entities.status !== 'in_flight' && hasObservedRefresh) {
            await sleep(500);
            return buildPreloadSummary(zoom, false);
        }
        await sleep(BENCHMARK_BATCH_POLL_MS);
    }

    return buildPreloadSummary(zoom, true);
}

function buildBatchReport(lines: string[]): string {
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio.toFixed(2) : '-';
    const mapState = useStore.getState().mapState;
    const context = `IRIS BENCH BATCH browser ${navigator.userAgent.match(/(Chrome|Firefox|Edg|Version)\/[\d.]+/)?.[0] ?? 'unknown'} platform ${navigator.platform || '-'} viewport ${viewport} dpr ${dpr} center ${mapState.lat.toFixed(5)},${mapState.lng.toFixed(5)} z${mapState.zoom.toFixed(2)} load current-page hardReload manual`;
    return [context, ...lines].join('\n');
}

async function copyText(text: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(text);
}

function showReportFallback(report: string): void {
    window.prompt('IRIS benchmark batch report', report);
}

export function MockToolsBar(): JSX.Element | null {
    useRenderDiagnostics('MockToolsBar');

    const [benchmarkVariant, setBenchmarkVariant] = useState<BenchmarkVariant>('normal');
    const [benchmarkZoom, setBenchmarkZoom] = useState<BenchmarkZoom>(14.36);
    const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>('pan');
    const [batchStatus, setBatchStatus] = useState<string>('');
    const [batchRunning, setBatchRunning] = useState(false);
    const [lastBatchReport, setLastBatchReport] = useState('');
    const [showBatchReport, setShowBatchReport] = useState(false);
    const showMockTools = useStore((state) => state.showMockTools);
    const hasMockArtifacts = useStore((state) => Object.keys(state.artifacts).length > 0);
    const hasMockOrnaments = useStore((state) => Object.keys(state.mockOrnaments).length > 0);
    const hasMockInventory = useStore((state) => state.inventory.some((item) => MOCK_INVENTORY_GUID_PATTERN.test(item.guid)));
    const hasMockPortalKeys = useStore((state) => state.inventory.some((item) => item.guid.startsWith('mock-loaded-')));
    const hasMockPasscode = useStore((state) => state.passcodeRewards !== null);
    const hasMockPlayerTracker = useStore((state) =>
        state.pluginFeatures.features.some((feature) => String(feature.properties?.id ?? '').startsWith('mock-player:'))
    );
    const hasMockPlayerActivity = useStore((state) =>
        state.plexts.some((plext) => plext.id.startsWith(MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX))
    );

    if (!showMockTools) {
        return null;
    }

    const actions: MockToolAction[] = [
        {
            label: 'Artifacts',
            loadTitle: 'Load mock artifacts',
            clearTitle: 'Clear mock artifacts',
            loadType: 'IRIS_LOAD_MOCK_ARTIFACTS',
            clearType: 'IRIS_CLEAR_MOCK_ARTIFACTS',
            active: hasMockArtifacts,
        },
        {
            label: 'Ornaments',
            loadTitle: 'Load mock ornaments',
            clearTitle: 'Clear mock ornaments',
            loadType: 'IRIS_LOAD_MOCK_ORNAMENTS',
            clearType: 'IRIS_CLEAR_MOCK_ORNAMENTS',
            active: hasMockOrnaments,
        },
        {
            label: 'Inventory',
            loadTitle: 'Load mock inventory',
            clearTitle: 'Clear mock inventory',
            loadType: 'IRIS_LOAD_MOCK_INVENTORY',
            clearType: 'IRIS_CLEAR_MOCK_INVENTORY',
            active: hasMockInventory,
        },
        {
            label: '500 Keys',
            loadTitle: 'Load 500 mock keys on loaded portals',
            clearTitle: 'Clear mock key inventory',
            loadType: 'IRIS_LOAD_MOCK_PORTAL_KEYS_500',
            clearType: 'IRIS_CLEAR_MOCK_INVENTORY',
            active: hasMockPortalKeys,
        },
        {
            label: 'Passcode',
            loadTitle: 'Load mock passcode rewards',
            clearTitle: 'Clear mock passcode rewards',
            loadType: 'IRIS_LOAD_MOCK_PASSCODE',
            clearType: 'IRIS_CLEAR_MOCK_PASSCODE',
            active: hasMockPasscode,
        },
        {
            label: '8 Players',
            loadTitle: 'Load 8 mock players on one portal',
            clearTitle: 'Clear mock player tracker pins',
            loadType: 'IRIS_LOAD_MOCK_PLAYER_TRACKER',
            clearType: 'IRIS_CLEAR_MOCK_PLAYER_TRACKER',
            active: hasMockPlayerTracker,
        },
        {
            label: 'Activity',
            loadTitle: 'Load 10 mock player activity plexts across nearby portals',
            clearTitle: 'Clear mock player activity plexts',
            loadType: 'IRIS_LOAD_MOCK_PLAYER_ACTIVITY',
            clearType: 'IRIS_CLEAR_MOCK_PLAYER_ACTIVITY',
            active: hasMockPlayerActivity,
        },
    ];

    const runBenchmarkBatch = async (): Promise<void> => {
        if (batchRunning) return;

        setBatchRunning(true);
        setLastBatchReport('');
        const lines: string[] = [];
        let preloadedZoom: BenchmarkZoom | null = null;

        try {
            for (const [index, testCase] of BENCHMARK_BATCH.entries()) {
                if (preloadedZoom !== testCase.zoom) {
                    setBatchStatus(`preload z${testCase.zoom}`);
                    const preloadSummary = await preloadBenchmarkZoom(testCase.zoom);
                    lines.push(`PRELOAD z${testCase.zoom} | ${preloadSummary}`);
                    preloadedZoom = testCase.zoom;
                }
                setBatchStatus(`${index + 1}/${BENCHMARK_BATCH.length} ${testCase.label}`);
                const startedAt = Date.now();
                window.postMessage({
                    type: 'IRIS_RUN_PAN_BENCHMARK',
                    benchmarkVariant: testCase.variant,
                    benchmarkZoom: testCase.zoom,
                    benchmarkMode: testCase.mode,
                }, '*');
                await waitForBenchmarkResult(testCase, startedAt);
                lines.push(buildBatchReportLine(testCase));
                await sleep(500);
            }

            const report = buildBatchReport(lines);
            setLastBatchReport(report);
            setShowBatchReport(true);
            setBatchStatus('copying');
            try {
                await copyText(report);
                setBatchStatus('copied');
            } catch (error) {
                console.warn('IRIS benchmark batch clipboard copy failed', error);
                setBatchStatus('copy blocked');
                showReportFallback(report);
            }
        } catch (error) {
            const report = buildBatchReport(lines);
            setLastBatchReport(report);
            if (report.length > 0) setShowBatchReport(true);
            console.warn('IRIS benchmark batch failed', error, report);
            setBatchStatus(error instanceof Error ? error.message : 'batch failed');
        } finally {
            setBatchRunning(false);
        }
    };

    const copyLastBatchReport = async (): Promise<void> => {
        if (!lastBatchReport) return;
        try {
            await copyText(lastBatchReport);
            setBatchStatus('copied');
        } catch (error) {
            console.warn('IRIS benchmark batch clipboard copy failed', error);
            setBatchStatus('copy blocked');
            showReportFallback(lastBatchReport);
        }
    };

    const showLastBatchReport = (): void => {
        if (!lastBatchReport) return;
        setShowBatchReport(true);
    };

    return (
        <div>
            <div className="iris-mock-tools-bar iris-ui-floating-panel iris-ui-scroll-row" aria-label="Mock data tools">
                <span className="iris-mock-tools-label">Mock</span>
                {actions.map((action) => (
                    <button
                        key={action.loadType}
                        className={`iris-mock-tools-btn iris-ui-compact-pill ${action.active ? 'iris-ui-compact-pill-active iris-mock-tools-btn-active' : ''}`}
                        title={action.active ? action.clearTitle : action.loadTitle}
                        onClick={() => window.postMessage({ type: action.active ? action.clearType : action.loadType }, '*')}
                        aria-pressed={action.active}
                    >
                        {action.label}
                    </button>
                ))}
                <button
                    className="iris-mock-tools-btn iris-ui-compact-pill"
                    title={`Run a 5 second automated ${benchmarkMode} benchmark (${benchmarkVariant}, z${benchmarkZoom})`}
                    onClick={() => window.postMessage({ type: 'IRIS_RUN_PAN_BENCHMARK', benchmarkVariant, benchmarkZoom, benchmarkMode }, '*')}
                >
                    Bench
                </button>
                <button
                    className={`iris-mock-tools-btn iris-ui-compact-pill ${batchRunning ? 'iris-ui-compact-pill-active iris-mock-tools-btn-active' : ''}`}
                    title="Run the standard desktop/mobile benchmark matrix and copy a compact report"
                    onClick={() => void runBenchmarkBatch()}
                    disabled={batchRunning}
                >
                    {batchRunning ? 'Batch...' : 'Batch'}
                </button>
                {lastBatchReport && !batchRunning && (
                    <button
                        className="iris-mock-tools-btn iris-ui-compact-pill"
                        title="Copy the last benchmark batch report again"
                        onClick={() => void copyLastBatchReport()}
                    >
                        Copy Batch
                    </button>
                )}
                {lastBatchReport && !batchRunning && (
                    <button
                        className="iris-mock-tools-btn iris-ui-compact-pill"
                        title="Show the last benchmark batch report in a selectable panel"
                        onClick={showLastBatchReport}
                    >
                        Show Batch
                    </button>
                )}
                {batchStatus && (
                    <span className="iris-mock-tools-label" title={batchStatus}>
                        {batchStatus}
                    </span>
                )}
                <select
                    className="iris-input iris-mock-tools-btn"
                    title="Benchmark variant"
                    value={benchmarkVariant}
                    onChange={(event) => setBenchmarkVariant((event.target as HTMLSelectElement).value as BenchmarkVariant)}
                >
                    {BENCHMARK_VARIANTS.map((variant) => (
                        <option key={variant.value} value={variant.value}>
                            {variant.label}
                        </option>
                    ))}
                </select>
                <select
                    className="iris-input iris-mock-tools-btn"
                    title="Benchmark mode"
                    value={benchmarkMode}
                    onChange={(event) => setBenchmarkMode((event.target as HTMLSelectElement).value as BenchmarkMode)}
                >
                    {BENCHMARK_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                            {mode.label}
                        </option>
                    ))}
                </select>
                <select
                    className="iris-input iris-mock-tools-btn"
                    title="Benchmark zoom"
                    value={String(benchmarkZoom)}
                    onChange={(event) => setBenchmarkZoom(Number((event.target as HTMLSelectElement).value) as BenchmarkZoom)}
                >
                    {BENCHMARK_ZOOMS.map((zoom) => (
                        <option key={zoom.value} value={zoom.value}>
                            {zoom.label}
                        </option>
                    ))}
                </select>
            </div>
            {showBatchReport && lastBatchReport && (
                <div className="iris-benchmark-report-panel iris-ui-floating-panel">
                    <div className="iris-benchmark-report-header">
                        <span>Benchmark Report</span>
                        <button
                            className="iris-mock-tools-btn iris-ui-compact-pill"
                            title="Close benchmark report"
                            onClick={() => setShowBatchReport(false)}
                        >
                            Close
                        </button>
                    </div>
                    <textarea
                        className="iris-benchmark-report-text"
                        readOnly
                        value={lastBatchReport}
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </div>
            )}
        </div>
    );
}
