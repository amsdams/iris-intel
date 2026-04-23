import { useEffect } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { useStore, EntityParser, PortalDetailsParser, Portal, Link, Field } from '@iris/core';

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
            if (!msg || msg.type !== 'IRIS_DATA') return;
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
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [map, liveMode, patternMode, logEvent, selected, setSelected, syncToMap]);
}
