declare global {
  interface Window {
    L?: LeafletGlobal;
    __iitcIrisContentInitialized?: boolean;
    __iitcIrisPageRuntimeInitialized?: boolean;
  }
}

export interface LeafletGlobal {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (urlTemplate: string, options?: Record<string, unknown>) => {addTo: (map: LeafletMap) => unknown};
  circleMarker: (latLng: [number, number], options?: Record<string, unknown>) => LeafletPath;
  polyline: (latLngs: [number, number][], options?: Record<string, unknown>) => LeafletPath;
  polygon: (latLngs: [number, number][], options?: Record<string, unknown>) => LeafletPath;
  control: {
    zoom: (options?: Record<string, unknown>) => {addTo: (map: LeafletMap) => unknown};
  };
}

export interface LeafletPath {
  addTo: (map: LeafletMap) => LeafletPath;
  remove: () => LeafletPath;
}

export interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  getCenter: () => {lat: number; lng: number};
  getBounds: () => {
    getSouth: () => number;
    getWest: () => number;
    getNorth: () => number;
    getEast: () => number;
  };
  getZoom: () => number;
  on: (event: string, handler: () => void) => LeafletMap;
  invalidateSize: () => LeafletMap;
  remove: () => LeafletMap;
}
