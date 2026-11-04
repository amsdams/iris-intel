export interface IitcIrisDrawToolsLatLng {
  lat: number;
  lng: number;
}

export interface IitcIrisDrawToolsPolyline {
  type: 'polyline';
  latLngs: IitcIrisDrawToolsLatLng[];
  color?: string;
  storageIndex: number;
}

export interface IitcIrisDrawToolsMarker {
  type: 'marker';
  latLng: IitcIrisDrawToolsLatLng;
  color?: string;
  label?: string;
  storageIndex: number;
}

export type IitcIrisDrawToolsItem = IitcIrisDrawToolsPolyline | IitcIrisDrawToolsMarker;
