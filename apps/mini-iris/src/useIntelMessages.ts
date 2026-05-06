import { useEffect } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { useStore, EntityParser, PortalDetailsParser, GameScoreParser, RegionScoreParser, InventoryParser, PlayerParser, PlextParser, Portal, Link, Field } from '@iris/core';
import type { GameScoreData, IntelMapData, InventoryData, PlextData, PortalDetailsData, RegionScoreData, PlayerStatsMessage as CorePlayerStatsMessage } from '@iris/core';
import { isIrisDataMessage, isRecord, numberOrNull, stringOrNull } from './messages';

export function useIntelMessages(
    map: maplibregl.Map | null,
    liveMode: boolean,
    patternMode: number,
    selected: SelectedEntity | null,
    setSelected: (val: SelectedEntity | null) => void,
    syncToMap: (map: maplibregl.Map, live: boolean, pattern: number) => void,
    logEvent: (msg: string) => void
): void {
    useEffect(() => {
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
                if (map) syncToMap(map, liveMode, patternMode);
            } else if (msg.url.includes('getPortalDetails')) {
                const store = useStore.getState();
                const guid = stringOrNull(parsedParams.guid) ?? '';
                if (!guid) return;
                const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
                const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;
                const parsed = PortalDetailsParser.parse(msg.data as PortalDetailsData, { guid }, linksIn + linksOut);
                if (parsed) {
                    store.updatePortals([parsed]);
                    logEvent(`Details: ${parsed.name || 'unknown'} | ${parsed.resonators?.length || 0} resos`);
                    if (selected?.type === 'portal' && selected.data.id === guid) {
                        setSelected({ type: 'portal', data: store.portals[guid] });
                    }
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
                if (plexts.length > 0) {
                    store.updatePlexts(plexts);
                    logEvent(`COMM: ${plexts.length} messages`);
                }
            }
        };
        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [map, liveMode, patternMode, logEvent, selected, setSelected, syncToMap]);
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
