import L, {type Layer as LeafletLayer, type Map as LeafletMap} from 'leaflet';
import {applyIitcPlayerTrackerCommMessages, getIitcPlayerTrackerDiagnostics, getIitcPlayerTrackerLatLng,
  getIitcPlayerTrackerEventOpacity, getIitcPlayerTrackerTraceAgeBucket, isIitcPlayerTrackerEnabled,
  isIitcPlayerTrackerTeamVisible, isIitcPlayerTrackerVisibleForZoom, pruneIitcPlayerTrackerStored,
  IITC_PLAYER_TRACKER_LINE_COLOR, IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS, IITC_PLAYER_TRACKER_MAX_TIME,
  IITC_PLAYER_TRACKER_MIN_ZOOM, type IitcCommMessage, type IitcPlayerTrackerDiagnostics, type IitcPlayerTrackerStored} from '@iris/iitc-core';
import type {IitcIrisLayerSettings, IitcIrisRenderPortal} from '../messages';
import type {IitcIrisMapLifetime} from './map-runtime-lifetime';
import {createPlayerTrackerMarkers, type PlayerTrackerMarkerGroup} from './player-tracker-markers';
import {createPlayerTrackerGroupPopup} from './player-tracker-group-popup';

interface PlayerTrackerRuntimeOptions {
  getMap: () => LeafletMap | undefined;
  getLifetime: () => IitcIrisMapLifetime | undefined;
  getLayerSettings: () => IitcIrisLayerSettings;
  isAuthRecoveryActive: () => boolean;
  getCommRequest: () => ((signal: AbortSignal) => Promise<unknown>) | undefined;
  applyCommResponse: (response: unknown) => IitcCommMessage[];
  clearLayers: () => void;
  addLayer: (layer: LeafletLayer) => void;
  repostLatestEntityStatus: () => void;
  zoomToAndShowPortal: (guid: string | undefined, lat: number, lng: number, zoom: number) => void;
  defaultZoom: number;
  assetBaseUrl: string;
  pane: string;
}

interface PlayerTrackerRuntime {
  renderPlayerTracker: () => void;
  processPlayerTrackerCommMessages: (messages: IitcCommMessage[]) => void;
  schedulePlayerTrackerRefresh: (delayMs?: number) => void;
  clearPlayerTrackerRefreshTimer: () => void;
  getDiagnostics: () => IitcPlayerTrackerDiagnostics;
  clearMarkers: () => void;
  dispose: () => void;
}

const PLAYER_TRACKER_COMM_REFRESH_MS = 120_000;
const PLAYER_TRACKER_MARKER_ICON_OPTIONS = {
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
};

export function createPlayerTrackerRuntime(options: PlayerTrackerRuntimeOptions): PlayerTrackerRuntime {
  const {clearLayers, addLayer, repostLatestEntityStatus, zoomToAndShowPortal} = options;
  let playerTrackerStored: IitcPlayerTrackerStored = {};
  let playerTrackerLatestCommTime: number | null = null;
  let playerTrackerDiagnostics: IitcPlayerTrackerDiagnostics = getIitcPlayerTrackerDiagnostics(playerTrackerStored);
  let playerTrackerRefreshTimer: number | undefined;
  let currentPlayerTrackerCommAbortController: AbortController | undefined;
  const playerTrackerProcessedCommGuids = new Set<string>();
  const playerTrackerMarkers = createPlayerTrackerMarkers({
    createMarker: (group, now) => {
      const {name, player} = group.members[0];
      const last = player.events[player.events.length - 1];
      const marker = createPlayerTrackerMarker(group.latLng, name, player.team,
        getIitcPlayerTrackerEventOpacity(last.time, now), last.time);
      marker.setIcon(getPlayerTrackerGroupIcon(group));
      marker.options.title = getPlayerTrackerGroupTitle(group);
      marker.options.keyboard = group.members.length > 1;
      const map = options.getMap();
      if (map) marker.addTo(map);
      return marker;
    },
    createPopup: (group, selectedName, select) => createPlayerTrackerGroupPopup(
      group, selectedName, select, createPlayerTrackerPopup, formatPlayerTrackerAgo),
    updateMarker: (marker, group, previous) => {
      if (group.members.length !== previous.members.length || getPlayerTrackerGroupTeam(group) !== getPlayerTrackerGroupTeam(previous)) {
        marker.setIcon(getPlayerTrackerGroupIcon(group));
      }
      const title = getPlayerTrackerGroupTitle(group);
      marker.options.title = title;
      const icon = marker.getElement();
      if (icon) icon.title = title;
    },
  });

  function formatPlayerTrackerAgo(time: number, now = Date.now()): string {
    const seconds = Math.max(0, Math.floor((now - time) / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d${hours % 24}h${minutes % 60}m`;
    if (hours > 0) return `${hours}h${minutes % 60}m`;
    return `${minutes}m`;
  }

  function createPlayerTrackerPopup(playerName: string, player: IitcPlayerTrackerStored[string]): HTMLElement {
    const root = document.createElement('div');
    root.className = 'plugin-player-tracker-popup iitc-iris-player-tracker-popup';
    const title = document.createElement('span');
    title.className = `nickname ${player.team === 'R' ? 'res' : player.team === 'E' ? 'enl' : 'mac'} iitc-iris-player-tracker-name iitc-iris-player-tracker-${player.team}`;
    title.textContent = playerName;
    root.append(title);

    const last = player.events[player.events.length - 1];
    root.append(document.createElement('br'));
    root.append(document.createTextNode(formatPlayerTrackerAgo(last.time)));
    root.append(document.createElement('br'));
    root.append(createPlayerTrackerPortalLink(last));

    const previous = player.events.slice(-IITC_PLAYER_TRACKER_MAX_DISPLAY_EVENTS, -1).reverse();
    if (previous.length > 0) {
      root.append(document.createElement('br'));
      root.append(document.createElement('br'));
      root.append(document.createTextNode('previous locations:'));
      root.append(document.createElement('br'));

      const table = document.createElement('table');
      table.className = 'iitc-iris-player-tracker-previous-table';
      for (const event of previous) {
        const row = document.createElement('tr');
        const ageCell = document.createElement('td');
        ageCell.textContent = `${formatPlayerTrackerAgo(event.time)} ago`;
        const portalCell = document.createElement('td');
        portalCell.append(createPlayerTrackerPortalLink(event));
        row.append(ageCell, portalCell);
        table.append(row);
      }
      root.append(table);
    }

    return root;
  }

  function createPlayerTrackerPortalLink(event: IitcPlayerTrackerStored[string]['events'][number]): HTMLButtonElement {
    const latLng = getIitcPlayerTrackerLatLng(event);
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'iitc-iris-player-tracker-link';
    link.textContent = event.name || event.address || 'portal';
    link.title = event.address ? `${event.name || 'portal'}\n${event.address}` : link.textContent;
    link.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      const map = options.getMap();
      zoomToAndShowPortal(undefined, latLng[0], latLng[1], map ? Math.max(map.getZoom(), options.defaultZoom) : options.defaultZoom);
    });
    link.addEventListener('dblclick', (clickEvent) => {
      clickEvent.preventDefault();
      zoomToAndShowPortal(undefined, latLng[0], latLng[1], options.defaultZoom);
    });
    return link;
  }

  function createPlayerTrackerMarker(latLng: [number, number], playerName: string, team: IitcIrisRenderPortal['team'], opacity: number, latestTime: number): L.Marker {
    const icon = getPlayerTrackerMarkerIcon(team, playerName);
    return L.marker(latLng, {
      icon,
      opacity,
      keyboard: false,
      pane: options.pane,
      title: `${playerName}, ${formatPlayerTrackerAgo(latestTime)} ago`,
    });
  }

  function getPlayerTrackerMarkerIcon(team: IitcIrisRenderPortal['team'], playerName: string): L.Icon | L.DivIcon {
    if ((team === 'R' || team === 'E') && options.assetBaseUrl) {
      const color = team === 'R' ? 'blue' : 'green';
      return L.icon({
        iconUrl: `${options.assetBaseUrl}images/marker-${color}.png`,
        iconRetinaUrl: `${options.assetBaseUrl}images/marker-${color}-2x.png`,
        shadowUrl: `${options.assetBaseUrl}images/marker-shadow.png`,
        className: `iitc-iris-player-tracker-marker-image iitc-iris-player-tracker-marker-${team}`,
        ...PLAYER_TRACKER_MARKER_ICON_OPTIONS,
      });
    }

    return L.divIcon({
      className: `iitc-iris-player-tracker-marker iitc-iris-player-tracker-marker-${team}`,
      html: `<span>${playerName.slice(0, 1).toUpperCase()}</span>`,
      iconSize: [22, 30],
      iconAnchor: [11, 30],
      popupAnchor: [1, -24],
    });
  }

  function getPlayerTrackerGroupTeam(group: PlayerTrackerMarkerGroup): string {
    const team = group.members[0].player.team;
    return group.members.every(member => member.player.team === team) ? team : 'mixed';
  }

  function getPlayerTrackerGroupTitle(group: PlayerTrackerMarkerGroup): string {
    if (group.members.length > 1) return `${group.members.length} agents last seen here`;
    const {name, player} = group.members[0];
    return `${name}, ${formatPlayerTrackerAgo(player.events[player.events.length - 1].time)} ago`;
  }

  function getPlayerTrackerGroupIcon(group: PlayerTrackerMarkerGroup): L.Icon | L.DivIcon {
    if (group.members.length === 1) {
      const {name, player} = group.members[0];
      return getPlayerTrackerMarkerIcon(player.team, name);
    }
    return L.divIcon({
      className: `iitc-iris-player-tracker-count iitc-iris-player-tracker-marker-${getPlayerTrackerGroupTeam(group)}`,
      html: `<span>${group.members.length}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30],
    });
  }

  function renderPlayerTracker(): void {
    clearLayers();
    playerTrackerStored = pruneIitcPlayerTrackerStored(playerTrackerStored);

    if (!isPlayerTrackerVisible()) {
      playerTrackerMarkers.clear();
      updatePlayerTrackerDiagnostics(0, 0);
      repostLatestEntityStatus();
      return;
    }

    const now = Date.now();
    let traces = 0;
    const visiblePlayers: IitcPlayerTrackerStored = {};

    for (const [playerName, player] of Object.entries(playerTrackerStored)) {
      if (player.events.length === 0) continue;
      if (!isIitcPlayerTrackerTeamVisible(player.team, options.getLayerSettings())) continue;

      for (let index = 1; index < player.events.length; index += 1) {
        const current = player.events[index];
        const previous = player.events[index - 1];
        const currentLatLng = getIitcPlayerTrackerLatLng(current);
        const previousLatLng = getIitcPlayerTrackerLatLng(previous);
        if (currentLatLng[0] === previousLatLng[0] && currentLatLng[1] === previousLatLng[1]) continue;
        const ageBucket = getIitcPlayerTrackerTraceAgeBucket(current.time, now);
        addLayer(L.polyline([previousLatLng, currentLatLng], {
          pane: options.pane,
          color: IITC_PLAYER_TRACKER_LINE_COLOR,
          weight: 2 - 0.25 * ageBucket,
          opacity: 1 - 0.2 * ageBucket,
          dashArray: '5,8',
          interactive: false,
        }));
        traces += 1;
      }

      visiblePlayers[playerName] = player;
    }

    const markers = playerTrackerMarkers.render(visiblePlayers, now);
    updatePlayerTrackerDiagnostics(markers, traces);
    repostLatestEntityStatus();
  }

  function isPlayerTrackerVisible(): boolean {
    const map = options.getMap();
    return isIitcPlayerTrackerVisibleForZoom(options.getLayerSettings(), map?.getZoom(), IITC_PLAYER_TRACKER_MIN_ZOOM);
  }

  function updatePlayerTrackerDiagnostics(markers = playerTrackerDiagnostics.markers, traces = playerTrackerDiagnostics.traces): void {
    playerTrackerDiagnostics = getIitcPlayerTrackerDiagnostics(playerTrackerStored, {
      enabled: isIitcPlayerTrackerEnabled(options.getLayerSettings()),
      visible: isPlayerTrackerVisible(),
      markers,
      traces,
      latestCommTime: playerTrackerLatestCommTime,
      minZoom: IITC_PLAYER_TRACKER_MIN_ZOOM,
      maxAgeMs: IITC_PLAYER_TRACKER_MAX_TIME,
    });
  }

  function cancelActivePlayerTrackerFetch(): void {
    currentPlayerTrackerCommAbortController?.abort();
    currentPlayerTrackerCommAbortController = undefined;
  }

  function clearPlayerTrackerRefreshTimer(): void {
    if (playerTrackerRefreshTimer !== undefined) {
      options.getLifetime()?.cancelScheduled(playerTrackerRefreshTimer);
      playerTrackerRefreshTimer = undefined;
    }
  }

  function schedulePlayerTrackerRefresh(delayMs = 250): void {
    clearPlayerTrackerRefreshTimer();
    if (options.isAuthRecoveryActive()) return;
    if (!isPlayerTrackerVisible()) {
      cancelActivePlayerTrackerFetch();
      renderPlayerTracker();
      return;
    }
    playerTrackerRefreshTimer = options.getLifetime()?.schedule(() => {
      playerTrackerRefreshTimer = undefined;
      void refreshPlayerTrackerComm();
    }, delayMs);
  }

  function processPlayerTrackerCommMessages(messages: IitcCommMessage[]): void {
    const result = applyIitcPlayerTrackerCommMessages({
      messages,
      stored: playerTrackerStored,
      processedGuids: playerTrackerProcessedCommGuids,
      latestCommTime: playerTrackerLatestCommTime,
    });
    playerTrackerProcessedCommGuids.clear();
    for (const guid of result.processedGuids) playerTrackerProcessedCommGuids.add(guid);
    playerTrackerStored = result.stored;
    playerTrackerLatestCommTime = result.latestCommTime;
  }

  async function refreshPlayerTrackerComm(): Promise<void> {
    if (!isPlayerTrackerVisible()) {
      renderPlayerTracker();
      return;
    }
    cancelActivePlayerTrackerFetch();
    const request = options.getCommRequest();
    if (!request) {
      renderPlayerTracker();
      return;
    }

    const abortController = new AbortController();
    currentPlayerTrackerCommAbortController = abortController;

    try {
      const response = await request(abortController.signal);
      abortController.signal.throwIfAborted();
      const messages = options.applyCommResponse(response);
      processPlayerTrackerCommMessages(messages);
      renderPlayerTracker();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        renderPlayerTracker();
      }
    } finally {
      if (currentPlayerTrackerCommAbortController === abortController) {
        currentPlayerTrackerCommAbortController = undefined;
        if (isPlayerTrackerVisible()) schedulePlayerTrackerRefresh(PLAYER_TRACKER_COMM_REFRESH_MS);
      }
    }
  }

  return {
    renderPlayerTracker, processPlayerTrackerCommMessages, schedulePlayerTrackerRefresh, clearPlayerTrackerRefreshTimer,
    getDiagnostics: () => playerTrackerDiagnostics,
    clearMarkers: () => playerTrackerMarkers.clear(),
    dispose: (): void => {
      cancelActivePlayerTrackerFetch();
      clearPlayerTrackerRefreshTimer();
      playerTrackerMarkers.clear();
    },
  };
}
