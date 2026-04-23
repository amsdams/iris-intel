import { useEffect } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { useStore, EntityParser, PortalDetailsParser, GameScoreParser, RegionScoreParser, InventoryParser, PlayerParser, Portal, Link, Field } from '@iris/core';

export function useIntelMessages(
    map: maplibregl.Map | null,
    liveMode: boolean,
    patternMode: number,
    selected: { type: string; data: Portal | Link | Field } | null,
    setSelected: (val: { type: string; data: Portal | Link | Field } | null) => void,
    syncToMap: (map: maplibregl.Map, live: boolean, pattern: number) => void,
    logEvent: (msg: string) => void
) {
    useEffect(() => {
        const handler = (event: MessageEvent): void => {
            const msg = event.data;
            if (!msg) return;

            if (msg.type === 'IRIS_PLAYER_STATS') {
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
                logEvent(`Agent: ${msg.nickname} (L${msg.level})`);
                return;
            }

            if (msg.type !== 'IRIS_DATA') return;
            let parsedParams: any = msg.params;
            if (typeof msg.params === 'string') { try { parsedParams = JSON.parse(msg.params); } catch { } }

            if (msg.url.includes('getEntities')) {
                const parsed = EntityParser.parse(msg.data);
                const store = useStore.getState();
                if (parsed.portals.length > 0) store.updatePortals(parsed.portals);
                if (parsed.links.length > 0) store.updateLinks(parsed.links);
                if (parsed.fields.length > 0) store.updateFields(parsed.fields);
                store.syncIndex();
                if (msg.data.result?.map) store.setTileFreshness(Object.keys(msg.data.result.map));
                logEvent(`Live Data: ${parsed.portals.length}P, ${parsed.links.length}L`);
                if (map) syncToMap(map, liveMode, patternMode);
            } else if (msg.url.includes('getPortalDetails')) {
                const store = useStore.getState();
                const guid = parsedParams?.guid || '';
                if (!guid) return;
                const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
                const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;
                const parsed = PortalDetailsParser.parse(msg.data, { guid }, linksIn + linksOut);
                if (parsed) {
                    store.updatePortals([parsed]);
                    logEvent(`Details: ${parsed.name || 'unknown'} | ${parsed.resonators?.length || 0} resos`);
                    if (selected?.type === 'portal' && selected.data.id === guid) {
                        setSelected({ type: 'portal', data: store.portals[guid] });
                    }
                }
            } else if (msg.url.includes('getGameScore')) {
                const store = useStore.getState();
                const parsed = GameScoreParser.parse(msg.data);
                store.setGameScore(parsed);
                logEvent(`Global Score Updated`);
            } else if (msg.url.includes('getRegionScoreDetails')) {
                const store = useStore.getState();
                const parsed = RegionScoreParser.parse(msg.data);
                if (parsed) {
                    store.setRegionScore(parsed);
                    logEvent(`Region Score: ${parsed.regionName}`);
                }
            } else if (msg.url.includes('getHasActiveSubscription')) {
                const store = useStore.getState();
                store.setHasSubscription(msg.data.result === true);
                logEvent(`Subscription: ${msg.data.result ? 'C.O.R.E.' : 'Standard'}`);
            } else if (msg.url.includes('getInventory')) {
                const store = useStore.getState();
                const items = InventoryParser.parse(msg.data);
                if (items.length > 0) store.setInventory(items);
                
                if (msg.data.result) {
                    if ((msg.data as any).player) {
                        const parsed = PlayerParser.parseStats((msg.data as any).player);
                        store.setPlayerStats(parsed.stats);
                        store.setHasSubscription(parsed.hasActiveSubscription);
                    }
                }
                logEvent(`Inventory: ${items.length} items`);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [map, liveMode, patternMode, logEvent, selected, setSelected, syncToMap]);
}
