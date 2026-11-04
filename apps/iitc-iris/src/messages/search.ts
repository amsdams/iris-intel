export interface IitcIrisSearchResult {
  id: string;
  type: 'portal' | 'address' | 'coordinate' | 'guid' | 'empty';
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  geojson?: unknown;
  guid?: string;
  team?: 'E' | 'R' | 'N' | 'M';
  level?: number;
  health?: number;
  icon?: string;
}

export interface IitcIrisSearchState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  term: string;
  confirmed: boolean;
  results: IitcIrisSearchResult[];
  localResults: number;
  onlineResults?: number;
  elapsedMs?: number;
  error?: string;
}
