import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import type {IitcIrisRenderEntities, IitcIrisRenderPortal, IitcIrisRenderLink, IitcIrisRenderField,
  IitcIrisSelectedPortal, IitcIrisMissionWaypoint, IitcIrisPortalDetailsState} from '../messages';
import {getLayerPane, type IitcIrisMapLayers} from './map-layers';
import {createIitcGeodesicPolygon, createIitcGeodesicPolyline} from './leaflet-geodesic';
import {
  findIitcPortalByGuidOrLatLng,
  planIitcPortalLinkNavigation,
  resolveIitcPendingPortalSelection,
  type IitcPortalDetails,
} from '@iris/iitc-core';

interface MapSelectionOptions {
  getMap: () => LeafletMap | undefined;
  getEntities: () => IitcIrisRenderEntities | undefined;
  getPortalRadius: (level: number | undefined, placeholder: boolean) => number;
  isPortalVisible: (portal: IitcIrisRenderPortal) => boolean;
  isLinkVisible: (link: IitcIrisRenderLink) => boolean;
  isFieldVisible: (field: IitcIrisRenderField) => boolean;
  ensureLayers: () => IitcIrisMapLayers;
  clearRenderedLayers: (layers: LeafletLayer[]) => void;
  addRenderedLayer: (layers: LeafletLayer[], layer: LeafletLayer) => void;
  renderEntities: (entities: IitcIrisRenderEntities) => void;
  selectedPortalChanged: () => void;
  refreshSelectedPortalDetails: (guid: string) => Promise<void>;
  clearPortalDetails: () => void;
  cancelActivePortalDetailsFetch: () => void;
  repostLatestEntityStatus: () => void;
}

/** Page-owned selection survives map replacement; overlays always use current map layers. */
export function createMapSelectionRuntime(options: MapSelectionOptions): {
  getSelectedPortalGuid: () => string | undefined;
  getSelectedPortal: () => IitcIrisSelectedPortal | null;
  hasPendingPortalSelection: () => boolean;
  resolvePendingPortalSelection: (entities: IitcIrisRenderEntities) => void;
  applyPortalDetails: (details: IitcPortalDetails, state: IitcIrisPortalDetailsState) => void;
  selectPortal: typeof selectPortal;
  renderSelectedPortal: typeof renderSelectedPortal;
  renderSelectedMapObject: typeof renderSelectedMapObject;
  selectMapObject: typeof selectMapObject;
  clearSelectedMapObject: typeof clearSelectedMapObject;
  findPortalByGuidOrLatLng: typeof findPortalByGuidOrLatLng;
  zoomToAndShowPortal: typeof zoomToAndShowPortal;
  selectMissionWaypoint: typeof selectMissionWaypoint;
  clearPortalSelection: typeof clearPortalSelection;
} {
  const {getMap, getEntities, getPortalRadius, isPortalVisible, isLinkVisible, isFieldVisible,
    ensureLayers, clearRenderedLayers, addRenderedLayer, renderEntities, selectedPortalChanged,
    refreshSelectedPortalDetails, clearPortalDetails, cancelActivePortalDetailsFetch, repostLatestEntityStatus} = options;
  let selectedPortalGuid: string | undefined;
  let selectedPortal: IitcIrisSelectedPortal | null = null;
  let selectedMapObject: {type: 'link' | 'field'; guid: string} | null = null;
  let pendingPortalSelection: {guid?: string; lat?: number; lng?: number} | null = null;

  function toLatLng(latE6: number, lngE6: number): [number, number] {
    return [latE6 / 1e6, lngE6 / 1e6];
  }

  function toSelectedPortal(portal: IitcIrisRenderPortal): IitcIrisSelectedPortal {
    const latestEntities = getEntities();
    const incomingLinks = latestEntities?.links.filter((link) => link.dGuid === portal.guid) ?? [];
    const outgoingLinks = latestEntities?.links.filter((link) => link.oGuid === portal.guid) ?? [];
    const linkGuids = [...outgoingLinks, ...incomingLinks].map((link) => link.guid);
    const fieldGuids = latestEntities?.fields
      .filter((field) => field.points.some((point) => point.guid === portal.guid))
      .map((field) => field.guid) ?? [];

    return {
      guid: portal.guid,
      title: portal.title,
      image: portal.image,
      team: portal.team,
      latE6: portal.latE6,
      lngE6: portal.lngE6,
      level: portal.level,
      health: portal.health,
      resCount: portal.resCount,
      mission: portal.mission,
      mission50plus: portal.mission50plus,
      isPlaceholder: portal.isPlaceholder,
      ornaments: portal.ornaments ?? [],
      artifacts: portal.artifacts ?? [],
      links: {
        count: linkGuids.length,
        incoming: incomingLinks.length,
        outgoing: outgoingLinks.length,
        guids: linkGuids,
      },
      fields: {
        count: fieldGuids.length,
        guids: fieldGuids,
      },
    };
  }

  function createSelectedPortalMarker(portal: IitcIrisRenderPortal): LeafletLayer {
    const radius = Math.max(10, getPortalRadius(portal.level, portal.isPlaceholder) + 5);
    return L.circleMarker(toLatLng(portal.latE6, portal.lngE6), {
      radius,
      color: '#ff9900',
      fill: false,
      opacity: 1,
      pane: getLayerPane('selectedPortal'),
      weight: 4,
      interactive: false,
    });
  }

  function createSelectedLinkMarker(link: IitcIrisRenderLink): LeafletLayer {
    return createIitcGeodesicPolyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
      color: '#ff9900',
      opacity: 0.95,
      pane: getLayerPane('selectedMapObject'),
      weight: 5,
      interactive: false,
    });
  }

  function createSelectedFieldMarker(field: IitcIrisRenderField): LeafletLayer {
    return createIitcGeodesicPolygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
      color: '#ff9900',
      fill: false,
      opacity: 0.95,
      pane: getLayerPane('selectedMapObject'),
      weight: 4,
      interactive: false,
    });
  }

  function renderSelectedPortal(): void {
    const latestEntities = getEntities();
    const layers = ensureLayers();
    clearRenderedLayers(layers.selectedPortal);
    if (!selectedPortalGuid) {
      selectedPortal = null;
      return;
    }

    const portal = latestEntities?.portals.find((candidate) => candidate.guid === selectedPortalGuid);
    if (!portal) {
      selectedPortal = null;
      return;
    }

    selectedPortal = toSelectedPortal(portal);
    if (!isPortalVisible(portal)) return;
    addRenderedLayer(layers.selectedPortal, createSelectedPortalMarker(portal));
  }

  function renderSelectedMapObject(): void {
    const latestEntities = getEntities();
    const layers = ensureLayers();
    clearRenderedLayers(layers.selectedMapObject);
    if (!selectedMapObject || !latestEntities) return;

    if (selectedMapObject.type === 'link') {
      const link = latestEntities.links.find((candidate) => candidate.guid === selectedMapObject?.guid);
      if (link && isLinkVisible(link)) addRenderedLayer(layers.selectedMapObject, createSelectedLinkMarker(link));
      return;
    }

    const field = latestEntities.fields.find((candidate) => candidate.guid === selectedMapObject?.guid);
    if (field && isFieldVisible(field) && field.points.length >= 3) addRenderedLayer(layers.selectedMapObject, createSelectedFieldMarker(field));
  }

  function selectMapObject(type: 'link' | 'field', guid: string): void {
    selectedMapObject = {type, guid};
    renderSelectedMapObject();
  }

  function clearSelectedMapObject(): void {
    selectedMapObject = null;
    clearRenderedLayers(ensureLayers().selectedMapObject);
  }

  function selectPortal(portal: IitcIrisRenderPortal, rerender = true): void {
    const latestEntities = getEntities();
    selectedMapObject = null;
    selectedPortalGuid = portal.guid;
    selectedPortal = toSelectedPortal(portal);
    pendingPortalSelection = null;
    selectedPortalChanged();
    void refreshSelectedPortalDetails(portal.guid);
    if (rerender && latestEntities) renderEntities(latestEntities);
    repostLatestEntityStatus();
  }

  function findPortalByGuidOrLatLng(guid: string | undefined, lat: number | undefined, lng: number | undefined): IitcIrisRenderPortal | undefined {
    const latestEntities = getEntities();
    return findIitcPortalByGuidOrLatLng(latestEntities?.portals ?? [], {guid, lat, lng});
  }

  function selectPortalByLatLng(lat: number | undefined, lng: number | undefined): IitcIrisRenderPortal | undefined {
    const latestEntities = getEntities();
    const plan = planIitcPortalLinkNavigation(latestEntities?.portals ?? [], {lat, lng});
    if (plan.portal) {
      selectPortal(plan.portal);
      return plan.portal;
    }
    if (plan.pendingSelection) pendingPortalSelection = plan.pendingSelection;
    return undefined;
  }

  function zoomToAndShowPortal(guid: string | undefined, lat: number | undefined, lng: number | undefined, zoom: number | undefined): void {
    const latestEntities = getEntities();
    const map = getMap();
    if (!map) return;
    const selectedPortal = guid ? undefined : selectPortalByLatLng(lat, lng);
    if (selectedPortal) {
      map.setView(toLatLng(selectedPortal.latE6, selectedPortal.lngE6), zoom ?? Math.max(map.getZoom(), 15));
      return;
    }
    const plan = planIitcPortalLinkNavigation(latestEntities?.portals ?? [], {guid, lat, lng, zoom});
    if (plan.portal) {
      const latLng = toLatLng(plan.portal.latE6, plan.portal.lngE6);
      map.setView(latLng, plan.focus?.zoom ?? Math.max(map.getZoom(), 15));
      selectPortal(plan.portal);
      return;
    }
    if (plan.pendingSelection) pendingPortalSelection = plan.pendingSelection;
    if (!plan.focus) {
      return;
    }
    map.setView([plan.focus.lat, plan.focus.lng], plan.focus.zoom ?? Math.max(map.getZoom(), 15));
  }

  function selectMissionWaypoint(waypoint: IitcIrisMissionWaypoint): void {
    const map = getMap();
    if (!map || waypoint.latE6 === undefined || waypoint.lngE6 === undefined) return;
    zoomToAndShowPortal(
      waypoint.portalGuid,
      waypoint.latE6 / 1_000_000,
      waypoint.lngE6 / 1_000_000,
      Math.max(map.getZoom(), 15),
    );
  }

  function clearPortalSelection(): void {
    selectedPortalGuid = undefined;
    selectedPortal = null;
    pendingPortalSelection = null;
    clearPortalDetails();
    selectedPortalChanged();
    cancelActivePortalDetailsFetch();
    clearRenderedLayers(ensureLayers().selectedPortal);
    repostLatestEntityStatus();
  }

  function applyPortalDetails(details: IitcPortalDetails, state: IitcIrisPortalDetailsState): void {
    const currentEntities = getEntities();
    const portal = currentEntities?.portals.find((candidate) => candidate.guid === details.guid);
    if (currentEntities && portal) {
      portal.title = details.title || portal.title;
      portal.image = details.image || portal.image;
      portal.team = details.team;
      portal.latE6 = details.latE6;
      portal.lngE6 = details.lngE6;
      portal.level = details.level;
      portal.health = details.health;
      portal.resCount = details.resCount;
      portal.mission = details.hasMissionsStartingHere;
      portal.history = state.history;
      portal.isPlaceholder = false;
      selectedPortal = toSelectedPortal(portal);
      renderEntities(currentEntities);
    }
  }

  function resolvePendingPortalSelection(entities: IitcIrisRenderEntities): void {
    if (pendingPortalSelection) {
      const portal = resolveIitcPendingPortalSelection(pendingPortalSelection, entities.portals);
      if (portal) selectPortal(portal, false);
    }
  }

  return {getSelectedPortalGuid: () => selectedPortalGuid, getSelectedPortal: () => selectedPortal,
    hasPendingPortalSelection: () => pendingPortalSelection !== null, resolvePendingPortalSelection, applyPortalDetails,
    selectPortal, renderSelectedPortal, renderSelectedMapObject, selectMapObject, clearSelectedMapObject,
    findPortalByGuidOrLatLng, zoomToAndShowPortal, selectMissionWaypoint, clearPortalSelection};
}
