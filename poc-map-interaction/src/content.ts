import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';
import { MockDataGenerator, Faction } from './MockDataGenerator';

console.log("POC (TS): CartoDB Dark Tiles Active");

function initMap() {
    document.body.innerHTML = '';
    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        html, body { 
            margin: 0; padding: 0; width: 100vw; height: 100vh; 
            overflow: hidden; background: #000 !important; 
        }
        #map-poc-container { 
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: #111;
        }
        .debug-btn {
            width: 55px; height: 55px; background: #222; color: #fff;
            border: 2px solid #00ffff; border-radius: 8px; font-size: 24px;
            z-index: 1000005; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            -webkit-user-select: none; user-select: none;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }
        .debug-btn:active { background: #00ffff; color: #000; }
    `;
    document.head.appendChild(bodyStyle);

    const generator = new MockDataGenerator();
    let spatialIndex = new RBush<any>();
    const COLORS = { ENL: '#00ff00', RES: '#0000ff', MAC: '#ff0000', NEU: '#ffffff' };

    function generateForViewport(bounds: maplibregl.LngLatBounds) {
        generator.clear();
        spatialIndex = new RBush();
        const lngRange = Math.abs(bounds.getEast() - bounds.getWest());
        const latRange = Math.abs(bounds.getNorth() - bounds.getSouth());

        for (let i = 0; i < 20; i++) {
            const f: Faction = ['NEU', 'ENL', 'RES', 'MAC'][Math.floor(Math.random() * 4)] as Faction;
            generator.addPortal(`P-${i}`, f, bounds.getWest() + Math.random() * lngRange, bounds.getSouth() + Math.random() * latRange);
        }
    }

    function syncToMap(map: maplibregl.Map) {
        const features: any[] = [];
        generator.portals.forEach(p => {
            spatialIndex.insert({ minX: p.lng, minY: p.lat, maxX: p.lng, maxY: p.lat, id: p.id, type: 'portal', faction: p.faction, data: p });
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, type: 'portal', faction: p.faction } });
        });
        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
    }

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    document.body.appendChild(container);

    const log = document.createElement('div');
    log.style.cssText = `
        position: fixed; bottom: 10px; left: 10px; right: 10px; height: 100px;
        background: rgba(0,0,0,0.85); color: #00ffff; overflow-y: auto;
        z-index: 2000000; font-family: monospace; padding: 10px;
        font-size: 10px; border: 1px solid #00ffff; pointer-events: none;
        border-radius: 4px;
    `;
    document.body.appendChild(log);

    function logEvent(msg: string) {
        const e = document.createElement('div');
        e.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(e);
    }

    const map = new maplibregl.Map({
        container: 'map-poc-container',
        style: {
            version: 8,
            sources: {
                'carto': {
                    type: 'raster',
                    tiles: [
                        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; CARTO'
                },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                { id: 'p', type: 'circle', source: 'entities', paint: { 'circle-radius': 6, 'circle-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [0, 0], zoom: 3,
        dragPan: true, touchZoomRotate: true
    });

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'position: fixed; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px; z-index: 2000001;';
    document.body.appendChild(btnContainer);

    const makeBtn = (label: string, action: () => void) => {
        const b = document.createElement('div');
        b.className = 'debug-btn';
        b.textContent = label;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); action(); });
        btnContainer.appendChild(b);
    };

    makeBtn('+', () => map.zoomIn());
    makeBtn('-', () => map.zoomOut());
    makeBtn('↑', () => map.panBy([0, -150]));
    makeBtn('↓', () => map.panBy([0, 150]));
    makeBtn('←', () => map.panBy([-150, 0]));
    makeBtn('→', () => map.panBy([150, 0]));
    makeBtn('R', () => { map.setCenter([0,0]); map.setZoom(3); });

    map.on('load', () => {
        logEvent("MAP LOADED (CartoDB Dark). Use Buttons to move.");
        map.resize();
        generateForViewport(map.getBounds());
        syncToMap(map);
    });

    map.on('moveend', () => {
        const c = map.getCenter();
        logEvent(`MOVE: ${c.lng.toFixed(2)}, ${c.lat.toFixed(2)}`);
        generateForViewport(map.getBounds());
        syncToMap(map);
    });

    map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point);
        if (hits.length > 0) logEvent(`HIT: ${hits[0].properties?.id}`);
    });
}

setTimeout(initMap, 500);
