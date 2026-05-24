import { useEffect, useRef } from 'preact/hooks';
import { useStore, EntityParser, PortalDetailsParser, GameScoreParser, RegionScoreParser, InventoryParser, PlayerParser, PlextParser, extractPlextPortalRefreshHints, resolvePlextPortalRefreshHint, Portal, Link, Field } from '@iris/core';
import type { GameScoreData, IntelMapData, InventoryData, Plext, PlextData, PortalDetailsData, RegionScoreData, PlayerStatsMessage as CorePlayerStatsMessage } from '@iris/core';
import { isIrisDataMessage, isRecord, numberOrNull, stringOrNull } from './messages';

const PLEXT_PORTAL_DETAILS_COOLDOWN_MS = 30_000;
const PLEXT_PORTAL_HINT_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const PLEXT_PORTAL_DETAILS_MAX_PER_BATCH = 5;
const PLEXT_PORTAL_DETAILS_PENDING_TIMEOUT_MS = 45_000;
const PLEXT_RAW_DEBUG_MAX_CHARS = 120_000;

export interface PlextDebugSnapshot {
    capturedAt: string;
    raw: string;
    parsed: string;
}

export function useIntelMessages(
    liveMode: boolean,
    patternMode: number,
    selected: SelectedEntity | null,
    setSelected: (val: SelectedEntity | null) => void,
    syncToMap: (live: boolean, pattern: number) => void,
    logEvent: (msg: string) => void,
    onPlextDebugSnapshot?: (snapshot: PlextDebugSnapshot) => void
): void {
    const portalDetailRefreshTimesRef = useRef<Map<string, number>>(new Map());
    const portalDetailPendingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const refreshPortalsFromPlexts = (plexts: ReturnType<typeof PlextParser.parse>): void => {
            if (!liveMode) return;
            const hints = extractPlextPortalRefreshHints(plexts, { maxAgeMs: PLEXT_PORTAL_HINT_MAX_AGE_MS });
            if (hints.length === 0) {
                logEvent(`COMM refresh: 0 hints (${plexts.length} msgs)`);
                return;
            }

            const now = Date.now();
            let requested = 0;
            let resolved = 0;
            let pending = 0;
            let cooldown = 0;
            const resolvedPortalIds = new Set<string>();
            hints.forEach((hint) => {
                if (requested >= PLEXT_PORTAL_DETAILS_MAX_PER_BATCH) return;
                const portal = resolvePlextPortalRefreshHint(hint, Object.values(useStore.getState().portals));
                if (!portal) return;
                if (resolvedPortalIds.has(portal.id)) return;
                resolvedPortalIds.add(portal.id);
                resolved += 1;
                if (portalDetailPendingRef.current.has(portal.id)) {
                    pending += 1;
                    return;
                }
                const lastRefreshAt = portalDetailRefreshTimesRef.current.get(portal.id) ?? 0;
                if (now - lastRefreshAt < PLEXT_PORTAL_DETAILS_COOLDOWN_MS) {
                    cooldown += 1;
                    return;
                }
                portalDetailRefreshTimesRef.current.set(portal.id, now);
                portalDetailPendingRef.current.add(portal.id);
                window.setTimeout(() => {
                    portalDetailPendingRef.current.delete(portal.id);
                }, PLEXT_PORTAL_DETAILS_PENDING_TIMEOUT_MS);
                requested += 1;
                window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: portal.id }, '*');
            });

            if (requested > 0) {
                logEvent(`COMM refresh: ${requested} portal${requested === 1 ? '' : 's'} (${hints.length} hints)`);
            } else if (hints.length > 0) {
                logEvent(`COMM refresh: 0/${hints.length} hints (${resolved} known, ${pending} pending, ${cooldown} cooldown)`);
            }
        };

        const handler = (event: MessageEvent): void => {
            const msg: unknown = event.data;

            if (isPlayerStatsMessage(msg)) {
                const store = useStore.getState();
                store.setPlayerStats({
                    nickname: msg.nickname,
                    level: msg.level,
                    ap: msg.ap,
                    team: msg.team,
                    energy: msg.energy,
                    xm_capacity: msg.xm_capacity,
                    available_invites: msg.available_invites,
                    min_ap_for_current_level: msg.min_ap_for_current_level,
                    min_ap_for_next_level: msg.min_ap_for_next_level
                });
                store.setHasSubscription(msg.hasActiveSubscription);
                return;
            }

            if (!isIrisDataMessage(msg)) return;
            const parsedParams = parseParams(msg.params);

            if (msg.url.includes('getEntities')) {
                const parsed = EntityParser.parse(msg.data as IntelMapData);
                const store = useStore.getState();
                if (parsed.portals.length > 0) store.updatePortals(parsed.portals);
                if (parsed.links.length > 0) store.updateLinks(parsed.links);
                if (parsed.fields.length > 0) store.updateFields(parsed.fields);
                store.syncIndex();
                const mapFreshness = getResultMap(msg.data);
                if (mapFreshness) store.setTileFreshness(Object.keys(mapFreshness));
                logEvent(`Live Data: ${parsed.portals.length}P, ${parsed.links.length}L`);
                syncToMap(liveMode, patternMode);
            } else if (msg.url.includes('getPortalDetails')) {
                const store = useStore.getState();
                const guid = stringOrNull(parsedParams.guid) ?? '';
                if (!guid) return;
                portalDetailPendingRef.current.delete(guid);
                const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
                const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;
                const parsed = PortalDetailsParser.parse(msg.data as PortalDetailsData, { guid }, linksIn + linksOut);
                if (parsed) {
                    store.updatePortals([parsed]);
                    logEvent(`Details: ${parsed.name || 'unknown'} | ${parsed.resonators?.length || 0} resos`);
                    if (selected?.type === 'portal' && selected.data.id === guid) {
                        setSelected({ type: 'portal', data: store.portals[guid] });
                    }
                    syncToMap(liveMode, patternMode);
                }
            } else if (msg.url.includes('getGameScore')) {
                const store = useStore.getState();
                const parsed = GameScoreParser.parse(msg.data as GameScoreData);
                store.setGameScore(parsed);
                logEvent(`Global Score Updated`);
            } else if (msg.url.includes('getRegionScoreDetails')) {
                const store = useStore.getState();
                const parsed = RegionScoreParser.parse(msg.data as RegionScoreData);
                if (parsed) {
                    store.setRegionScore(parsed);
                    logEvent(`Region Score: ${parsed.regionName}`);
                }
            } else if (msg.url.includes('getHasActiveSubscription')) {
                const store = useStore.getState();
                const result = getResult(msg.data);
                store.setHasSubscription(result === true);
                logEvent(`C.O.R.E. Status: ${result ? 'ACTIVE' : 'INACTIVE'}`);
            } else if (msg.url.includes('getInventory')) {
                const store = useStore.getState();
                const items = InventoryParser.parse(msg.data as InventoryData);
                if (items.length > 0) store.setInventory(items);
                const result = getResult(msg.data);
                if (Array.isArray(result) && result.length === 0) {
                    logEvent(`Inventory: Access Denied (Non-C.O.R.E.)`);
                }
                const player = getPlayerPayload(msg.data);
                if (result && player) {
                    const parsed = PlayerParser.parseStats(player);
                    store.setPlayerStats(parsed.stats);
                    store.setHasSubscription(parsed.hasActiveSubscription);
                }
            } else if (msg.url.includes('getPlexts')) {
                const store = useStore.getState();
                const plexts = PlextParser.parse(msg.data as PlextData);
                onPlextDebugSnapshot?.(buildPlextDebugSnapshot(msg.data, msg.params, plexts));
                if (plexts.length > 0) {
                    store.updatePlexts(plexts);
                    logEvent(`COMM: ${plexts.length} messages`);
                    refreshPortalsFromPlexts(plexts);
                }
            }
        };
        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [liveMode, patternMode, logEvent, onPlextDebugSnapshot, selected, setSelected, syncToMap]);
}

interface PlayerStatsMessage {
    type: 'IRIS_PLAYER_STATS';
    nickname: string;
    level: number;
    ap: number;
    team: string;
    energy: number;
    xm_capacity: number;
    available_invites: number;
    min_ap_for_current_level: number;
    min_ap_for_next_level: number;
    hasActiveSubscription: boolean;
}

type SelectedEntity = { type: 'portal'; data: Portal } | { type: 'link'; data: Link } | { type: 'field'; data: Field };

function buildPlextDebugSnapshot(data: unknown, params: unknown, plexts: Plext[]): PlextDebugSnapshot {
    const capturedAt = new Date().toLocaleTimeString();
    const hints = extractPlextPortalRefreshHints(plexts, { maxAgeMs: PLEXT_PORTAL_HINT_MAX_AGE_MS });
    const raw = truncateDebugText(JSON.stringify({ capturedAt, params, data }, null, 2), PLEXT_RAW_DEBUG_MAX_CHARS);
    const parsedLines = [
        `Mini-IRIS COMM parsed snapshot @ ${capturedAt}`,
        `plexts ${plexts.length}`,
        `refreshHints ${hints.length}`,
        ...hints.map((hint, index) => `hint ${index + 1}: ${hint.name ?? '-'} @ ${hint.latE6},${hint.lngE6} reason=${hint.reason} plext=${hint.plextId}`),
        '',
        ...plexts.map(formatPlextForDebug),
    ];
    return { capturedAt, raw, parsed: parsedLines.join('\n') };
}

function truncateDebugText(value: string, maxChars: number): string {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}\n... truncated ${value.length - maxChars} chars`;
}

function formatPlextForDebug(plext: Plext, index: number): string {
    const timestamp = Number.isFinite(plext.time) ? new Date(plext.time).toLocaleTimeString() : String(plext.time);
    const markup = plext.markup
        .map(([kind, value]) => {
            const label = value.name ?? value.plain ?? value.team ?? '-';
            const coords = typeof value.latE6 === 'number' && typeof value.lngE6 === 'number' ? ` @ ${value.latE6},${value.lngE6}` : '';
            const address = value.address ? ` (${value.address})` : '';
            return `${kind}:${label}${coords}${address}`;
        })
        .join(' | ');
    return [
        `${index + 1}. ${timestamp} ${plext.type} team=${plext.team} categories=${plext.categories} id=${plext.id}`,
        `text: ${plext.text}`,
        `markup: ${markup || '-'}`,
    ].join('\n');
}

function isPlayerStatsMessage(value: unknown): value is PlayerStatsMessage {
    return isRecord(value)
        && value.type === 'IRIS_PLAYER_STATS'
        && typeof value.nickname === 'string'
        && numberOrNull(value.level) !== null
        && numberOrNull(value.ap) !== null
        && typeof value.team === 'string'
        && numberOrNull(value.energy) !== null
        && numberOrNull(value.xm_capacity) !== null
        && numberOrNull(value.available_invites) !== null
        && numberOrNull(value.min_ap_for_current_level) !== null
        && numberOrNull(value.min_ap_for_next_level) !== null
        && typeof value.hasActiveSubscription === 'boolean';
}

function parseParams(params: unknown): Record<string, unknown> {
    if (isRecord(params)) return params;
    if (typeof params !== 'string') return {};

    try {
        const parsed: unknown = JSON.parse(params);
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function getResult(data: unknown): unknown {
    return isRecord(data) ? data.result : undefined;
}

function getResultMap(data: unknown): Record<string, unknown> | null {
    const result = getResult(data);
    if (!isRecord(result) || !isRecord(result.map)) return null;
    return result.map;
}

function getPlayerPayload(data: unknown): CorePlayerStatsMessage | null {
    if (!isRecord(data) || !isCorePlayerStatsMessage(data.player)) return null;
    return data.player;
}

function isCorePlayerStatsMessage(value: unknown): value is CorePlayerStatsMessage {
    return isRecord(value)
        && typeof value.nickname === 'string'
        && numberOrNull(value.level) !== null
        && numberOrNull(value.ap) !== null
        && typeof value.team === 'string'
        && numberOrNull(value.energy) !== null
        && numberOrNull(value.xm_capacity) !== null
        && numberOrNull(value.available_invites) !== null
        && numberOrNull(value.min_ap_for_current_level) !== null
        && numberOrNull(value.min_ap_for_next_level) !== null
        && typeof value.hasActiveSubscription === 'boolean';
}
