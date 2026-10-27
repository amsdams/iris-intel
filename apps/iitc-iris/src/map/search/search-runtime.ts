import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {
  createIitcSearchErrorState, createIitcSearchIdleState, createIitcSearchLocalState, createIitcSearchSuccessState,
  getIitcLocalSearchResults, normalizeIitcNominatimResults, normalizeIitcSearchTerm, parseIitcSearchCoordinateResults,
  type IitcNominatimResult,
} from '@iris/iitc-core';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisRenderPortal, type IitcIrisSearchResult, type IitcIrisSearchState} from '../../messages';
import type {IitcIrisMapLifetime} from '../map-runtime-lifetime';

const SEARCH_AUTO_MIN_LENGTH = 3;
const SEARCH_RESULT_ZOOM = 15;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=';

interface SearchRuntimeOptions {
  getMap: () => LeafletMap | undefined;
  getLifetime: () => IitcIrisMapLifetime | undefined;
  getPortals: () => IitcIrisRenderPortal[];
  getPortalRadius: (level: number | undefined, isPlaceholder: boolean) => number;
  selectPortal: (portal: IitcIrisRenderPortal) => void;
  clearLayers: () => void;
  addLayer: (layer: LeafletLayer) => void;
  pane: string;
}

interface SearchRuntime {
  runSearch: (term: string | undefined, confirmed?: boolean) => Promise<void>;
  clearSearch: () => void;
  previewSearchResult: (result: IitcIrisSearchResult | undefined) => void;
  selectSearchResult: (result: IitcIrisSearchResult | undefined) => void;
  invalidateSearch: () => void;
}

/** Page-owned search state; requests are still bound to the current map lifetime. */
export function createSearchRuntime({
  getMap, getLifetime, getPortals, getPortalRadius, selectPortal, clearLayers, addLayer, pane,
}: SearchRuntimeOptions): SearchRuntime {
  let latestSearchSequence = 0;
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1_000_000, lngE6 / 1_000_000];

  function getLocalSearchResults(term: string): IitcIrisSearchResult[] {
    return getIitcLocalSearchResults({
      term,
      portals: getPortals(),
      autoMinLength: SEARCH_AUTO_MIN_LENGTH,
    });
  }

  async function fetchNominatimSearchResults(term: string): Promise<IitcIrisSearchResult[]> {
    const map = getMap();
    if (!map) return [];
    const lifetime = getLifetime();
    if (!lifetime) return [];
    const bounds = map.getBounds();
    const viewbox = `&viewbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    const seen = new Set<string>();
    const results: IitcIrisSearchResult[] = [];

    const fetchResults = async (bounded: boolean): Promise<boolean> => {
      const {text} = await lifetime.fetchText(`${NOMINATIM_SEARCH_URL}${encodeURIComponent(term)}${viewbox}${bounded ? '&bounded=1' : ''}`);
      const data = JSON.parse(text) as IitcNominatimResult[];
      if (bounded && data.length === 0) return false;
      results.push(...normalizeIitcNominatimResults(data, seen, 10 - results.length));
      return data.length > 0;
    };

    const hadBoundedResults = await fetchResults(true);
    if (!hadBoundedResults) await fetchResults(false);
    return results;
  }

  function postSearchState(search: IitcIrisSearchState): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchStatus,
      search,
    } satisfies IitcIrisMessage, '*');
  }

  async function runSearch(term: string | undefined, confirmed = false): Promise<void> {
    const searchTerm = normalizeIitcSearchTerm(term);
    latestSearchSequence += 1;
    const sequence = latestSearchSequence;
    clearLayers();

    if (!searchTerm) {
      postSearchState(createIitcSearchIdleState(confirmed));
      return;
    }
    if (searchTerm.length < SEARCH_AUTO_MIN_LENGTH && !confirmed) return;

    const localResults = [...getLocalSearchResults(searchTerm), ...parseIitcSearchCoordinateResults(searchTerm)];
    postSearchState(createIitcSearchLocalState({term: searchTerm, confirmed, localResults}));

    if (!confirmed) return;

    const startedAt = performance.now();
    try {
      const onlineResults = await fetchNominatimSearchResults(searchTerm);
      if (sequence !== latestSearchSequence) return;
      postSearchState(createIitcSearchSuccessState({
        term: searchTerm,
        confirmed,
        localResults,
        onlineResults,
        elapsedMs: performance.now() - startedAt,
      }));
    } catch (error) {
      if (sequence !== latestSearchSequence) return;
      postSearchState(createIitcSearchErrorState({
        term: searchTerm,
        confirmed,
        localResults,
        elapsedMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function clearSearch(): void {
    latestSearchSequence += 1;
    clearLayers();
    postSearchState(createIitcSearchIdleState());
  }

  function previewSearchResult(result: IitcIrisSearchResult | undefined): void {
    clearLayers();
    if (!result || result.type === 'empty') return;
    if (result.guid) {
      const portal = getPortals().find((candidate) => candidate.guid === result.guid);
      if (portal) {
        const latLng = toLatLng(portal.latE6, portal.lngE6);
        addLayer(L.circleMarker(latLng, {
          pane,
          radius: Math.max(10, getPortalRadius(portal.level, portal.isPlaceholder) + 4),
          color: '#ff3b30',
          fillColor: '#ff3b30',
          fillOpacity: 0.18,
          opacity: 0.9,
          weight: 2,
          interactive: false,
        }));
        return;
      }
    }
    if (result.bounds) {
      const bounds = L.latLngBounds([result.bounds.south, result.bounds.west], [result.bounds.north, result.bounds.east]);
      addLayer(createSearchResultLayer(result, bounds));
      return;
    }
    if (typeof result.lat === 'number' && typeof result.lng === 'number') {
      addLayer(createSearchResultLayer(result));
    }
  }

  function selectSearchResult(result: IitcIrisSearchResult | undefined): void {
    if (!result || result.type === 'empty') return;
    const map = getMap();
    if (!map) return;
    clearLayers();

    if (result.guid) {
      const portal = getPortals().find((candidate) => candidate.guid === result.guid);
      if (portal) {
        const latLng = toLatLng(portal.latE6, portal.lngE6);
        map.setView(latLng, SEARCH_RESULT_ZOOM);
        selectPortal(portal);
        return;
      }
    }

    if (result.bounds) {
      const bounds = L.latLngBounds([result.bounds.south, result.bounds.west], [result.bounds.north, result.bounds.east]);
      map.fitBounds(bounds, {maxZoom: SEARCH_RESULT_ZOOM});
      addLayer(createSearchResultLayer(result, bounds));
      return;
    }

    if (typeof result.lat === 'number' && typeof result.lng === 'number') {
      const latLng: [number, number] = [result.lat, result.lng];
      map.setView(latLng, SEARCH_RESULT_ZOOM);
      addLayer(L.circleMarker(latLng, {
        pane,
        radius: 8,
        color: '#ff3b30',
        fillColor: '#ff3b30',
        fillOpacity: 0.24,
        weight: 2,
        interactive: false,
      }));
    }
  }

  function createSearchResultLayer(result: IitcIrisSearchResult, bounds?: L.LatLngBounds): LeafletLayer {
    const options: L.PathOptions = {
      pane,
      interactive: false,
      color: '#ff3b30',
      fill: false,
      weight: 2,
      opacity: 0.8,
    };

    if (result.geojson && typeof result.geojson === 'object') {
      return L.geoJSON(result.geojson as GeoJSON.GeoJsonObject, {
        ...options,
        pointToLayer: (_feature, latLng) => L.marker(latLng, {
          pane,
          icon: L.divIcon({
            className: 'iitc-iris-search-marker',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          title: result.title,
          interactive: false,
        }),
      });
    }

    if (bounds) {
      return L.rectangle(bounds, options);
    }

    const latLng: [number, number] = [result.lat ?? 0, result.lng ?? 0];
    return L.circleMarker(latLng, {
      ...options,
      radius: 8,
      fillColor: '#ff3b30',
      fillOpacity: 0.24,
    });
  }

  return {runSearch, clearSearch, previewSearchResult, selectSearchResult,
    invalidateSearch: (): void => { latestSearchSequence += 1; }};
}
