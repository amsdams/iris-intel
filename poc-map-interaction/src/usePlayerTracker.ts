import { useState, useEffect, useCallback } from 'preact/hooks';
import { PlextParser, Plext } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import { createPlextRequestMessage, type PlextRequestBounds } from './plextRequests';

export interface PlayerEvent {
    latlngs: [number, number][];
    time: number;
    portalName: string;
}

export interface PlayerHistory {
    name: string;
    team: string;
    events: PlayerEvent[];
}

const EXPIRATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const PLEXT_POLL_MS = 120000;

export function usePlayerTracker(
    isVis: boolean,
    liveMode: boolean,
    logEvent: (msg: string) => void,
    plextBounds: PlextRequestBounds | null = null,
) {
    const [playerHistories, setPlayerHistories] = useState<Map<string, PlayerHistory>>(new Map());
    const [lastPlextTime, setLastPlextTime] = useState(-1);
    const telemetry = useEndpointTelemetry();

    const processPlexts = useCallback((plexts: Plext[]) => {
        if (plexts.length === 0) return;

        const newMaxTime = Math.max(...plexts.map(p => p.time));
        setLastPlextTime(prev => Math.max(prev, newMaxTime));

        setPlayerHistories(prev => {
            const next = new Map(prev);
            const limit = Date.now() - EXPIRATION_MS;

            // Sort oldest to newest for consistent history building
            const sorted = [...plexts].sort((a, b) => a.time - b.time);

            sorted.forEach(p => {
                if (p.time < limit) return;
                
                let playerName = '';
                let lat: number | null = null;
                let lng: number | null = null;
                let pName = '';
                let skipThis = false;

                for (const m of p.markup) {
                    const [type, data] = m;
                    if (type === 'TEXT') {
                        const txt = data.plain || '';
                        if (txt.includes('destroyed the Link') ||
                            txt.includes('destroyed a Control Field') ||
                            txt.includes('destroyed the') ||
                            txt.includes('Your Link')) {
                            skipThis = true;
                            break;
                        }
                    } else if (type === 'PLAYER' || type === 'SENDER' || type === 'AT_PLAYER') {
                        playerName = data.plain || '';
                    } else if ((type === 'PORTAL' || type === 'LINK') && !lat) {
                        lat = (data.latE6 || 0) / 1e6;
                        lng = (data.lngE6 || 0) / 1e6;
                        pName = data.name || '';
                    }
                }

                if (skipThis || !playerName || !lat || !lng) return;

                const history = next.get(playerName) || { name: playerName, team: p.team, events: [] };
                
                // Support Machina faction override
                const upper = playerName.toUpperCase();
                if (upper === 'MACHINA' || upper === '__MACHINA__') {
                    history.team = 'M';
                }

                // Logic to update/insert event (IITC style)
                const evts = history.events;
                let i = 0;
                for (i = 0; i < evts.length; i++) {
                    if (evts[i].time > p.time) break;
                }

                const cmp = Math.max(i - 1, 0);

                if (evts.length > 0 && evts[cmp].time === p.time) {
                    // Same timestamp (multiple resos), check if location is new
                    const alreadyHas = evts[cmp].latlngs.some(ll => ll[0] === lat && ll[1] === lng);
                    if (!alreadyHas) evts[cmp].latlngs.push([lat!, lng!]);
                    return;
                }

                // Check if player is still at same location
                const sameLoc = evts.length > 0 && evts[cmp].latlngs.some(ll => ll[0] === lat && ll[1] === lng);
                if (sameLoc) {
                    evts[cmp].time = p.time;
                } else {
                    evts.splice(i, 0, {
                        latlngs: [[lat, lng]],
                        time: p.time,
                        portalName: pName
                    });
                }

                // Keep only last 10 locations
                if (history.events.length > 10) history.events.shift();
                next.set(playerName, history);
            });

            // Global cleanup for expired data
            next.forEach((history, name) => {
                const firstValid = history.events.findIndex(e => e.time >= limit);
                if (firstValid === -1) next.delete(name);
                else if (firstValid > 0) history.events.splice(0, firstValid);
            });

            return next;
        });
    }, []);

    // Message Listener for COMM data
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (!msg || msg.type !== 'IRIS_DATA' || !msg.url.includes('getPlexts')) return;
            
            const plexts = PlextParser.parse(msg.data);
            if (plexts.length > 0) {
                processPlexts(plexts);
                logEvent(`COMM: ${plexts.length} messages parsed`);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [processPlexts, logEvent]);

    // Polling effect
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const poll = (): void => {
            const plexts = telemetry.plexts;
            const now = Date.now();
            if (plexts) {
                if (plexts.status === 'in_flight') return;
                if (plexts.cooldownUntil !== null && now < plexts.cooldownUntil) return;
                if (plexts.nextRefreshAt !== null && now < plexts.nextRefreshAt) return;
            }

            const request = createPlextRequestMessage('all', plextBounds, lastPlextTime, -1, lastPlextTime >= 0);
            if (request) {
                window.postMessage(request, '*');
            }
        };

        let timerId: number | null = null;
        const schedule = (): void => {
            poll();
            const nextDue = Math.max(
                telemetry.plexts?.nextRefreshAt !== null && telemetry.plexts?.nextRefreshAt !== undefined
                    ? telemetry.plexts.nextRefreshAt - Date.now()
                    : PLEXT_POLL_MS,
                PLEXT_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return () => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, lastPlextTime, plextBounds, telemetry.plexts]);

    return { playerHistories };
}
