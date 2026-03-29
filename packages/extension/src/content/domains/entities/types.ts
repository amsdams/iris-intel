export interface IntelTile {
  deletedGameEntityGuids?: string[];
  gameEntities?: [string, number, unknown[]][];
}

export interface IntelMapData {
  result?: {
    map?: Record<string, IntelTile>;
  };
}
