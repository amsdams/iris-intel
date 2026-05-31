import type {IitcGetEntitiesResponse, IitcMapTilePayload, IitcRawGameEntity} from './entity-decode';

export type IitcRenderQueueTileStatus = 'ok' | 'cache-fresh' | 'cache-stale';

export interface IitcRenderQueueEntry {
  id: string;
  deleted: string[];
  entities: IitcRawGameEntity[];
  status: IitcRenderQueueTileStatus;
}

export interface IitcRenderQueueState {
  entries: IitcRenderQueueEntry[];
}

export interface IitcRenderQueueDrainResult {
  state: IitcRenderQueueState;
  response: IitcGetEntitiesResponse;
  tileStatuses: Record<string, IitcRenderQueueTileStatus>;
}

export function createIitcRenderQueueState(): IitcRenderQueueState {
  return {entries: []};
}

export function pushIitcRenderQueueTile(
  state: IitcRenderQueueState,
  id: string,
  data: IitcMapTilePayload,
  status: IitcRenderQueueTileStatus,
): IitcRenderQueueState {
  return {
    entries: [
      ...state.entries,
      {
        id,
        deleted: [...(data.deletedGameEntityGuids ?? [])],
        entities: [...(data.gameEntities ?? [])],
        status,
      },
    ],
  };
}

export function drainIitcRenderQueueToResponse(
  state: IitcRenderQueueState,
  response: IitcGetEntitiesResponse = {result: {map: {}}},
): IitcRenderQueueDrainResult {
  const map = {...(response.result?.map ?? {})};
  const tileStatuses: Record<string, IitcRenderQueueTileStatus> = {};

  for (const entry of state.entries) {
    map[entry.id] = {
      deletedGameEntityGuids: [...entry.deleted],
      gameEntities: [...entry.entities],
    };
    tileStatuses[entry.id] = entry.status;
  }

  return {
    state: createIitcRenderQueueState(),
    response: {result: {map}},
    tileStatuses,
  };
}
