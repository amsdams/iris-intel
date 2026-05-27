import { h, JSX } from 'preact';
import { ENTITY_REQUEST_BATCH_SIZE, IRIS_BENCHMARK_SCENARIOS, buildEntityRequestPayload, useStore, type BenchmarkMode, type BenchmarkScenario, type BenchmarkZoom, type BoundsE6, type EndpointKey, type IrisBenchmarkVariant } from '@iris/core';
import { useRenderDiagnostics } from './useRenderDiagnostics';
import { useEffect, useRef, useState } from 'preact/hooks';

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
const URGENT_SOURCE_REASONS = new Set(['selection', 'visual-filters']);
const HEAVY_SOURCE_REASONS = new Set(['plugins', 'planning', 'artifacts', 'ornaments', 'mission']);

type BenchmarkVariant = IrisBenchmarkVariant;
type BenchmarkBatchCase = BenchmarkScenario<IrisBenchmarkVariant>;
type SourceReasonClass = 'urgent' | 'heavy' | 'snapshot' | 'other';

const BENCHMARK_BATCH: readonly BenchmarkBatchCase[] = IRIS_BENCHMARK_SCENARIOS;

const BENCHMARK_BATCH_TIMEOUT_MS = 45_000;
const BENCHMARK_BATCH_POLL_MS = 250;
const BENCHMARK_IDLE_QUIET_MS = 1_500;
const BENCHMARK_IDLE_CONFIRM_MS = 500;
const BENCHMARK_PENDING_REFRESH_WINDOW_MS = 2_000;
const BENCHMARK_IDLE_TIMEOUT_MS = 15_000;
const BENCHMARK_PRELOAD_MOVE_SETTLE_MS = 750;
const BENCHMARK_PRELOAD_TIMEOUT_MS = 25_000;
const BENCHMARK_PRELOAD_RETRY_MS = 1_000;
const BENCHMARK_ENDPOINT_KEYS: readonly EndpointKey[] = ['entities', 'portalDetails', 'plexts', 'artifacts', 'inventory', 'gameScore', 'regionScore', 'unknown'];
const BENCHMARK_TILE_SIZE = 512;
const MAX_MERCATOR_LAT = 85.05112878;

interface BenchmarkEndpointCounter {
    request: number;
    success: number;
    active: number;
    passive: number;
    moving: number;
    failure: number;
}

type BenchmarkEndpointCounterMap = Record<EndpointKey, BenchmarkEndpointCounter>;

interface BenchmarkEntityCounterSnapshot {
    staleQueuedDropCount: number;
    staleResponseIgnoreCount: number;
}

interface BenchmarkEntityPassSnapshot {
    lastPassId: number | null;
    lastPassStartedAt: number | null;
    lastPassReason: string | null;
    lastPassGeneration: number | null;
    lastPassTotalTiles: number;
    lastPassRequestedTiles: number;
    lastPassFreshTiles: number;
    lastPassBatchCount: number;
    lastPassDataZoom: number | null;
    lastSkipReason: string | null;
}

interface BenchmarkWindowSnapshot {
    startedAt: number;
    entities: BenchmarkEntityCounterSnapshot;
    longTaskCount: number;
    maxLongTaskMs: number;
    sourceSyncCount: number;
    movingSourceSyncCount: number;
    sourceUpdateCount: number;
    sourceUpdateSetDataMs: number;
    sourceUpdateSkippedUnchangedCount: number;
    movingSourceUpdateCount: number;
    movingSourceUpdateSetDataMs: number;
    movingSourceUpdateSkippedUnchangedCount: number;
    sourceUpdateCallCounts: Record<string, number>;
    sourceUpdateCallMs: Record<string, number>;
    sourceUpdateSkippedUnchangedCounts: Record<string, number>;
    sourceUpdateReasons: Record<string, number>;
}

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

function classifySourceReason(reason: string): SourceReasonClass {
    if (URGENT_SOURCE_REASONS.has(reason)) return 'urgent';
    if (reason === 'snapshot') return 'snapshot';
    if (reason.startsWith('entities:') || HEAVY_SOURCE_REASONS.has(reason)) return 'heavy';
    return 'other';
}

function formatSourceReasonMix(reasonDeltas: Array<readonly [string, number]>): string {
    const totals: Record<SourceReasonClass, number> = {
        urgent: 0,
        heavy: 0,
        snapshot: 0,
        other: 0,
    };
    reasonDeltas.forEach(([reason, count]) => {
        totals[classifySourceReason(reason)] += count;
    });
    return `urgent:${formatCount(totals.urgent)},heavy:${formatCount(totals.heavy)},snapshot:${formatCount(totals.snapshot)},other:${formatCount(totals.other)}`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function lngToMercatorX(lng: number, worldSize: number): number {
    return ((lng + 180) / 360) * worldSize;
}

function latToMercatorY(lat: number, worldSize: number): number {
    const clampedLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
    const sin = Math.sin((clampedLat * Math.PI) / 180);
    return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
}

function mercatorXToLng(x: number, worldSize: number): number {
    return (x / worldSize) * 360 - 180;
}

function mercatorYToLat(y: number, worldSize: number): number {
    const y2 = 0.5 - y / worldSize;
    return 90 - (360 * Math.atan(Math.exp(-y2 * 2 * Math.PI))) / Math.PI;
}

function estimateBenchmarkViewportBounds(lat: number, lng: number, zoom: BenchmarkZoom): BoundsE6 {
    const worldSize = BENCHMARK_TILE_SIZE * Math.pow(2, zoom);
    const centerX = lngToMercatorX(lng, worldSize);
    const centerY = latToMercatorY(lat, worldSize);
    const west = mercatorXToLng(centerX - window.innerWidth / 2, worldSize);
    const east = mercatorXToLng(centerX + window.innerWidth / 2, worldSize);
    const north = mercatorYToLat(centerY - window.innerHeight / 2, worldSize);
    const south = mercatorYToLat(centerY + window.innerHeight / 2, worldSize);

    return {
        minLatE6: Math.round(Math.min(south, north) * 1e6),
        minLngE6: Math.round(west * 1e6),
        maxLatE6: Math.round(Math.max(south, north) * 1e6),
        maxLngE6: Math.round(east * 1e6),
    };
}

function createEndpointCounters(): BenchmarkEndpointCounterMap {
    const counters = {} as BenchmarkEndpointCounterMap;
    BENCHMARK_ENDPOINT_KEYS.forEach((key) => {
        counters[key] = {
            request: 0,
            success: 0,
            active: 0,
            passive: 0,
            moving: 0,
            failure: 0,
        };
    });
    return counters;
}

function takeBenchmarkWindowSnapshot(startedAt = Date.now()): BenchmarkWindowSnapshot {
    const state = useStore.getState();
    const entities = state.endpointDiagnostics.entities;
    const viewport = state.mapPerfDiagnostics.viewport;

    return {
        startedAt,
        entities: {
            staleQueuedDropCount: entities.staleQueuedDropCount,
            staleResponseIgnoreCount: entities.staleResponseIgnoreCount,
        },
        longTaskCount: state.mainThreadDiagnostics.longTaskCount,
        maxLongTaskMs: state.mainThreadDiagnostics.maxLongTaskMs,
        sourceSyncCount: viewport?.sourceSyncCount ?? 0,
        movingSourceSyncCount: viewport?.movingSourceSyncCount ?? 0,
        sourceUpdateCount: viewport?.sourceUpdateCount ?? 0,
        sourceUpdateSetDataMs: viewport?.sourceUpdateSetDataMs ?? 0,
        sourceUpdateSkippedUnchangedCount: viewport?.sourceUpdateSkippedUnchangedCount ?? 0,
        movingSourceUpdateCount: viewport?.movingSourceUpdateCount ?? 0,
        movingSourceUpdateSetDataMs: viewport?.movingSourceUpdateSetDataMs ?? 0,
        movingSourceUpdateSkippedUnchangedCount: viewport?.movingSourceUpdateSkippedUnchangedCount ?? 0,
        sourceUpdateCallCounts: viewport?.sourceUpdateCallCounts ? {...viewport.sourceUpdateCallCounts} : {},
        sourceUpdateCallMs: viewport?.sourceUpdateCallMs ? {...viewport.sourceUpdateCallMs} : {},
        sourceUpdateSkippedUnchangedCounts: viewport?.sourceUpdateSkippedUnchangedCounts
            ? {...viewport.sourceUpdateSkippedUnchangedCounts}
            : {},
        sourceUpdateReasons: viewport?.sourceUpdateReasons ? {...viewport.sourceUpdateReasons} : {},
    };
}

function getBenchmarkEndpointCounters(startedAt: number, finishedAt = Date.now()): BenchmarkEndpointCounterMap {
    const counters = createEndpointCounters();
    const activity = useStore.getState().endpointActivityLog;

    activity.forEach((entry) => {
        if (entry.time < startedAt || entry.time > finishedAt) return;
        const counter = counters[entry.endpoint] ?? counters.unknown;
        if (entry.message.startsWith('request ')) {
            counter.request += 1;
        } else if (entry.message.startsWith('success ')) {
            counter.success += 1;
            if (entry.isMoving === true) {
                counter.moving += 1;
            }
            if (entry.message.endsWith(' active')) {
                counter.active += 1;
            } else if (entry.message.endsWith(' passive')) {
                counter.passive += 1;
            }
        } else if (entry.message.startsWith('error ')) {
            counter.failure += 1;
        }
    });

    return counters;
}

function formatEndpointCounter(key: EndpointKey, counter: BenchmarkEndpointCounter): string | null {
    const total = counter.request + counter.success + counter.failure;
    const alwaysShow = key === 'entities';
    if (!alwaysShow && total === 0) return null;

    return `${key} req ${formatCount(counter.request)} ok ${formatCount(counter.success)} active ${formatCount(counter.active)} passive ${formatCount(counter.passive)} moving ${formatCount(counter.moving)} fail ${formatCount(counter.failure)}`;
}

function formatBenchmarkEndpointCounters(counters: BenchmarkEndpointCounterMap): string {
    const parts = BENCHMARK_ENDPOINT_KEYS
        .map((key) => formatEndpointCounter(key, counters[key]))
        .filter((part): part is string => Boolean(part));
    return `net ${parts.join(' ; ')}`;
}

function formatBenchmarkEntityDeltas(snapshot: BenchmarkWindowSnapshot): string {
    const entities = useStore.getState().endpointDiagnostics.entities;
    const staleDrop = Math.max(0, entities.staleQueuedDropCount - snapshot.entities.staleQueuedDropCount);
    const staleIgnore = Math.max(0, entities.staleResponseIgnoreCount - snapshot.entities.staleResponseIgnoreCount);
    return `entityDelta staleDrop ${formatCount(staleDrop)} staleIgnore ${formatCount(staleIgnore)} skip ${entities.lastSkipReason ?? 'none'}`;
}

function hasBenchmarkEndpointInFlight(): boolean {
    return Object.values(useStore.getState().endpointDiagnostics).some((entry) => (
        entry.status === 'in_flight' || entry.inFlightCount > 0
    ));
}

function isBenchmarkNetworkQuiet(): boolean {
    const state = useStore.getState();
    const latestActivityAt = state.endpointActivityLog.reduce((latest, entry) => Math.max(latest, entry.time), 0);
    const quietForMs = latestActivityAt > 0 ? Date.now() - latestActivityAt : BENCHMARK_IDLE_QUIET_MS;
    const now = Date.now();
    const entityNextRefreshAt = state.endpointDiagnostics.entities.nextAutoRefreshAt;
    const entityNextRefreshInMs = typeof entityNextRefreshAt === 'number' ? entityNextRefreshAt - now : null;
    const hasPendingSoonEntityRefresh =
        entityNextRefreshInMs !== null &&
        entityNextRefreshInMs >= 0 &&
        entityNextRefreshInMs <= BENCHMARK_PENDING_REFRESH_WINDOW_MS;

    return (
        state.activeRequests === 0 &&
        !hasBenchmarkEndpointInFlight() &&
        !hasPendingSoonEntityRefresh &&
        quietForMs >= BENCHMARK_IDLE_QUIET_MS
    );
}

function snapshotBenchmarkEntityPass(): BenchmarkEntityPassSnapshot {
    const entities = useStore.getState().endpointDiagnostics.entities;

    return {
        lastPassId: entities.lastPassId,
        lastPassStartedAt: entities.lastPassStartedAt,
        lastPassReason: entities.lastPassReason,
        lastPassGeneration: entities.lastPassGeneration,
        lastPassTotalTiles: entities.lastPassTotalTiles,
        lastPassRequestedTiles: entities.lastPassRequestedTiles,
        lastPassFreshTiles: entities.lastPassFreshTiles,
        lastPassBatchCount: entities.lastPassBatchCount,
        lastPassDataZoom: entities.lastPassDataZoom,
        lastSkipReason: entities.lastSkipReason,
    };
}

function formatBenchmarkEntityPass(snapshot: BenchmarkWindowSnapshot, pass = snapshotBenchmarkEntityPass()): string {
    if (pass.lastPassId === null) return 'entityPass none';
    const scope = pass.lastPassStartedAt !== null && pass.lastPassStartedAt >= snapshot.startedAt ? 'current' : 'carry';
    return `entityPass ${scope} id ${formatCount(pass.lastPassId)} gen ${formatCount(pass.lastPassGeneration ?? undefined)} reason ${pass.lastPassReason ?? '-'} req ${formatCount(pass.lastPassRequestedTiles)}/${formatCount(pass.lastPassTotalTiles)} fresh ${formatCount(pass.lastPassFreshTiles)} batches ${formatCount(pass.lastPassBatchCount)} dataZoom ${formatCount(pass.lastPassDataZoom ?? undefined)}`;
}

function formatBenchmarkLongTaskDelta(snapshot: BenchmarkWindowSnapshot): string {
    const diagnostics = useStore.getState().mainThreadDiagnostics;
    const count = Math.max(0, diagnostics.longTaskCount - snapshot.longTaskCount);
    const recentMax = diagnostics.recentLongTasks
        .filter((task) => task.time >= snapshot.startedAt)
        .reduce((max, task) => Math.max(max, task.durationMs), 0);
    const max = recentMax || Math.max(0, diagnostics.maxLongTaskMs - snapshot.maxLongTaskMs);
    return `longtask count ${formatCount(count)} max ${formatMs(max)}`;
}

function getBenchmarkLongTaskCount(snapshot: BenchmarkWindowSnapshot): number {
    return Math.max(0, useStore.getState().mainThreadDiagnostics.longTaskCount - snapshot.longTaskCount);
}

function getBenchmarkMovingSourceCallCount(snapshot: BenchmarkWindowSnapshot): number {
    const viewport = useStore.getState().mapPerfDiagnostics.viewport;
    return Math.max(0, (viewport?.movingSourceUpdateCount ?? 0) - snapshot.movingSourceUpdateCount);
}

function getBenchmarkMovingEndpointSuccessCount(counters: BenchmarkEndpointCounterMap): number {
    return BENCHMARK_ENDPOINT_KEYS.reduce((total, key) => total + counters[key].moving, 0);
}

function formatBenchmarkNoise(snapshot: BenchmarkWindowSnapshot, counters: BenchmarkEndpointCounterMap): string {
    const movingNet = getBenchmarkMovingEndpointSuccessCount(counters);
    const movingSources = getBenchmarkMovingSourceCallCount(snapshot);
    const longTasks = getBenchmarkLongTaskCount(snapshot);
    const reasons = [
        movingNet > 0 ? `net-moving:${formatCount(movingNet)}` : null,
        movingSources > 0 ? `source-moving:${formatCount(movingSources)}` : null,
        longTasks > 0 ? `longtask:${formatCount(longTasks)}` : null,
    ].filter((reason): reason is string => Boolean(reason));

    return `noise ${reasons.length > 0 ? reasons.join(',') : 'clean'}`;
}

function formatBenchmarkSourceDelta(snapshot: BenchmarkWindowSnapshot): string {
    const viewport = useStore.getState().mapPerfDiagnostics.viewport;
    const syncCount = Math.max(0, (viewport?.sourceSyncCount ?? 0) - snapshot.sourceSyncCount);
    const movingSyncCount = Math.max(0, (viewport?.movingSourceSyncCount ?? 0) - snapshot.movingSourceSyncCount);
    const updateCount = Math.max(0, (viewport?.sourceUpdateCount ?? 0) - snapshot.sourceUpdateCount);
    const setDataMs = Math.max(0, (viewport?.sourceUpdateSetDataMs ?? 0) - snapshot.sourceUpdateSetDataMs);
    const skippedUnchangedCount = Math.max(
        0,
        (viewport?.sourceUpdateSkippedUnchangedCount ?? 0) - snapshot.sourceUpdateSkippedUnchangedCount
    );
    const movingCount = Math.max(0, (viewport?.movingSourceUpdateCount ?? 0) - snapshot.movingSourceUpdateCount);
    const movingSetDataMs = Math.max(0, (viewport?.movingSourceUpdateSetDataMs ?? 0) - snapshot.movingSourceUpdateSetDataMs);
    const movingSkippedUnchangedCount = Math.max(
        0,
        (viewport?.movingSourceUpdateSkippedUnchangedCount ?? 0) - snapshot.movingSourceUpdateSkippedUnchangedCount
    );
    const callCounts = viewport?.sourceUpdateCallCounts ?? {};
    const callMs = viewport?.sourceUpdateCallMs ?? {};
    const sourceSummary = Object.keys(callCounts)
        .map((source) => {
            const count = Math.max(0, callCounts[source] - (snapshot.sourceUpdateCallCounts[source] ?? 0));
            if (count === 0) return null;
            const elapsed = Math.max(0, (callMs[source] ?? 0) - (snapshot.sourceUpdateCallMs[source] ?? 0));
            return `${source}:${formatCount(count)}/${formatMs(elapsed)}`;
        })
        .filter((part): part is string => Boolean(part))
        .join(',');
    const skippedCounts = viewport?.sourceUpdateSkippedUnchangedCounts ?? {};
    const skippedSummary = Object.keys(skippedCounts)
        .map((source) => {
            const count = Math.max(0, skippedCounts[source] - (snapshot.sourceUpdateSkippedUnchangedCounts[source] ?? 0));
            if (count === 0) return null;
            return `${source}:${formatCount(count)}`;
        })
        .filter((part): part is string => Boolean(part))
        .join(',');
    const nextReasons = viewport?.sourceUpdateReasons ?? {};
    const reasonDeltas = Object.entries(nextReasons)
        .map(([reason, count]) => [reason, Math.max(0, count - (snapshot.sourceUpdateReasons[reason] ?? 0))] as const)
        .filter(([, count]) => count > 0);
    const reasonSummary = reasonDeltas
        .map(([reason, count]) => `${reason}:${formatCount(count)}`)
        .join(',');
    const reasonMixSummary = formatSourceReasonMix(reasonDeltas);

    return `sourceDelta syncs ${formatCount(syncCount)} movingSyncs ${formatCount(movingSyncCount)} calls ${formatCount(updateCount)} skipped ${formatCount(skippedUnchangedCount)} movingCalls ${formatCount(movingCount)} movingSkipped ${formatCount(movingSkippedUnchangedCount)} setData ${formatMs(setDataMs)} movingSetData ${formatMs(movingSetDataMs)} sources ${sourceSummary || 'none'} skippedSources ${skippedSummary || 'none'} reasonMix ${reasonMixSummary} reasons ${reasonSummary || 'none'}`;
}

function formatBenchmarkWorkload(testCase: BenchmarkBatchCase, sourceCounts: Record<string, number>): string {
    const state = useStore.getState();
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const bounds = state.mapState.bounds;
    const payload = bounds ? buildEntityRequestPayload(bounds, testCase.zoom) : null;
    const tileKeys = payload?.tileKeys ?? [];
    const tileFreshness = state.tileFreshness;
    const now = Date.now();
    const freshTiles = tileKeys.filter((key) => {
        const lastUpdate = tileFreshness[key];
        return typeof lastUpdate === 'number' && now - lastUpdate <= 120_000;
    }).length;
    const batchCount = Math.ceil(tileKeys.length / ENTITY_REQUEST_BATCH_SIZE);
    const center = `${state.mapState.lat.toFixed(5)},${state.mapState.lng.toFixed(5)}`;

    return [
        'workload',
        `z${testCase.zoom}`,
        `${formatCount(tileKeys.length)}tiles`,
        `${formatCount(freshTiles)}fresh`,
        `${formatCount(batchCount)}batches`,
        `dataZoom ${formatCount(payload?.dataZoom)}`,
        `P${formatCount(sourceCounts.portals)}`,
        `L${formatCount(sourceCounts.links)}`,
        `F${formatCount(sourceCounts.fields)}`,
        `plugin${formatCount(sourceCounts['plugin-features'])}`,
        `center ${center}`,
        `viewport ${viewport}`,
    ].join(' ');
}

function formatPluginCounts(counts: Record<string, number> | undefined): string {
    if (!counts) return 'pluginMix -';
    return `pluginMix total ${formatCount(counts.total)} labels ${formatCount(counts.labels)} player ${formatCount(counts.playerMarkers)} highlights ${formatCount(counts.highlights)} lines ${formatCount(counts.lines)} points ${formatCount(counts.points)}`;
}

function buildBatchReportLine(testCase: BenchmarkBatchCase, snapshot: BenchmarkWindowSnapshot, finishedAt = Date.now()): string {
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
    const endpointCounters = getBenchmarkEndpointCounters(snapshot.startedAt, finishedAt);

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
        formatBenchmarkNoise(snapshot, endpointCounters),
        formatBenchmarkEndpointCounters(endpointCounters),
        formatBenchmarkEntityDeltas(snapshot),
        formatBenchmarkEntityPass(snapshot),
        formatBenchmarkSourceDelta(snapshot),
        formatBenchmarkLongTaskDelta(snapshot),
        formatBenchmarkWorkload(testCase, sourceCounts),
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

function buildPreloadSummary(
    zoom: BenchmarkZoom,
    timedOut: boolean,
    snapshot: BenchmarkWindowSnapshot,
    passSnapshot?: BenchmarkEntityPassSnapshot,
): string {
    const state = useStore.getState();
    const bounds = state.mapState.bounds;
    const payload = bounds ? buildEntityRequestPayload(bounds, zoom) : null;
    const entities = state.endpointDiagnostics.entities;
    const tileCount = payload?.tileKeys.length ?? 0;
    const batchCount = Math.ceil(tileCount / ENTITY_REQUEST_BATCH_SIZE);
    const endpointCounters = getBenchmarkEndpointCounters(snapshot.startedAt);

    return [
        `request tiles ${formatCount(tileCount)}`,
        `batches ${formatCount(batchCount)}`,
        `dataZoom ${formatCount(payload?.dataZoom)}`,
        `loaded P ${formatCount(Object.keys(state.portals).length)}`,
        `L ${formatCount(Object.keys(state.links).length)}`,
        `F ${formatCount(Object.keys(state.fields).length)}`,
        `diagnostic ${payload?.diagnostic ?? 'none'}`,
        `skip ${passSnapshot?.lastSkipReason ?? entities.lastSkipReason ?? 'none'}`,
        formatBenchmarkEndpointCounters(endpointCounters),
        formatBenchmarkEntityDeltas(snapshot),
        formatBenchmarkEntityPass(snapshot, passSnapshot),
        formatBenchmarkSourceDelta(snapshot),
        timedOut ? 'timeout yes' : 'timeout no',
    ].join(' ');
}

async function waitForBenchmarkQuietWindow(timeoutMs = BENCHMARK_IDLE_TIMEOUT_MS): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (isBenchmarkNetworkQuiet()) {
            await sleep(BENCHMARK_IDLE_CONFIRM_MS);
            if (isBenchmarkNetworkQuiet()) return true;
        }
        await sleep(BENCHMARK_BATCH_POLL_MS);
    }

    return false;
}

async function preloadBenchmarkZoom(zoom: BenchmarkZoom): Promise<string> {
    const state = useStore.getState();
    const { lat, lng } = state.mapState;
    const startedAt = Date.now();
    const snapshot = takeBenchmarkWindowSnapshot(startedAt);
    const bounds = estimateBenchmarkViewportBounds(lat, lng, zoom);

    state.clearMapEntities();
    window.postMessage({ type: 'IRIS_MOVE_MAP', center: { lat, lng }, zoom, bounds }, '*');
    await sleep(BENCHMARK_PRELOAD_MOVE_SETTLE_MS);
    let lastManualRefreshAt = 0;

    const requestManualPreload = (): void => {
        lastManualRefreshAt = Date.now();
        window.postMessage({ type: 'IRIS_BENCHMARK_PRELOAD_ENTITIES' }, '*');
    };

    requestManualPreload();

    const deadline = Date.now() + BENCHMARK_PRELOAD_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const entities = useStore.getState().endpointDiagnostics.entities;
        const hasObservedManualPass =
            entities.lastPassStartedAt !== null &&
            entities.lastPassStartedAt >= startedAt &&
            entities.lastPassReason === 'manual';
        const manualPassSkippedInFlight = hasObservedManualPass && entities.lastSkipReason === 'in-flight';
        const manualPassStillMissing = !hasObservedManualPass || manualPassSkippedInFlight;

        if (
            entities.status !== 'in_flight' &&
            entities.inFlightCount === 0 &&
            manualPassStillMissing &&
            Date.now() - lastManualRefreshAt >= BENCHMARK_PRELOAD_RETRY_MS
        ) {
            await waitForBenchmarkQuietWindow();
            requestManualPreload();
        }

        if (entities.status !== 'in_flight' && entities.inFlightCount === 0 && hasObservedManualPass && !manualPassSkippedInFlight) {
            const passSnapshot = snapshotBenchmarkEntityPass();
            await waitForBenchmarkQuietWindow();
            return buildPreloadSummary(zoom, false, snapshot, passSnapshot);
        }
        await sleep(BENCHMARK_BATCH_POLL_MS);
    }

    return buildPreloadSummary(zoom, true, snapshot);
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

export function MockToolsBar(): JSX.Element | null {
    useRenderDiagnostics('MockToolsBar');

    const [benchmarkVariant, setBenchmarkVariant] = useState<BenchmarkVariant>('normal');
    const [benchmarkZoom, setBenchmarkZoom] = useState<BenchmarkZoom>(14.36);
    const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>('pan');
    const [batchStatus, setBatchStatus] = useState<string>('');
    const [batchRunning, setBatchRunning] = useState(false);
    const [lastBatchReport, setLastBatchReport] = useState('');
    const [showBatchReport, setShowBatchReport] = useState(false);
    const batchReportTextRef = useRef<HTMLTextAreaElement | null>(null);
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

    const selectLastBatchReport = (): void => {
        const reportText = batchReportTextRef.current;
        if (!reportText) return;
        reportText.focus();
        reportText.select();
    };

    const revealBatchReport = (): void => {
        setShowBatchReport(true);
        window.setTimeout(selectLastBatchReport, 0);
    };

    const showLastBatchReport = (): void => {
        if (!lastBatchReport) return;
        revealBatchReport();
    };

    useEffect(() => {
        if (!showBatchReport || !lastBatchReport) return undefined;

        const timeoutId = window.setTimeout(selectLastBatchReport, 0);
        return () => window.clearTimeout(timeoutId);
    }, [showBatchReport, lastBatchReport]);

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
                    await waitForBenchmarkQuietWindow();
                    const preloadSummary = await preloadBenchmarkZoom(testCase.zoom);
                    lines.push(`PRELOAD z${testCase.zoom} | ${preloadSummary}`);
                    preloadedZoom = testCase.zoom;
                }
                setBatchStatus(`${index + 1}/${BENCHMARK_BATCH.length} ${testCase.label}`);
                await waitForBenchmarkQuietWindow();
                const startedAt = Date.now();
                const snapshot = takeBenchmarkWindowSnapshot(startedAt);
                window.postMessage({
                    type: 'IRIS_RUN_PAN_BENCHMARK',
                    benchmarkVariant: testCase.variant,
                    benchmarkZoom: testCase.zoom,
                    benchmarkMode: testCase.mode,
                }, '*');
                await waitForBenchmarkResult(testCase, startedAt);
                lines.push(buildBatchReportLine(testCase, snapshot));
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
                revealBatchReport();
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
            revealBatchReport();
        }
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
                        <div className="iris-benchmark-report-actions">
                            <button
                                className="iris-mock-tools-btn iris-ui-compact-pill"
                                title="Copy benchmark report"
                                onClick={() => void copyLastBatchReport()}
                            >
                                Copy
                            </button>
                            <button
                                className="iris-mock-tools-btn iris-ui-compact-pill"
                                title="Select the full benchmark report"
                                onClick={selectLastBatchReport}
                            >
                                Select All
                            </button>
                            <button
                                className="iris-mock-tools-btn iris-ui-compact-pill"
                                title="Close benchmark report"
                                onClick={() => setShowBatchReport(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <textarea
                        ref={batchReportTextRef}
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
