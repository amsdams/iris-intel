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

export function drainIitcRenderQueueBatch(
  state: IitcRenderQueueState,
  entityLimit: number,
  response: IitcGetEntitiesResponse = {result: {map: {}}},
): IitcRenderQueueDrainResult {
  let remainingLimit = Math.max(0, Math.floor(entityLimit));
  const map = {...(response.result?.map ?? {})};
  const tileStatuses: Record<string, IitcRenderQueueTileStatus> = {};
  const entries = state.entries.map((entry) => ({
    ...entry,
    deleted: [...entry.deleted],
    entities: [...entry.entities],
  }));

  while (remainingLimit > 0 && entries.length > 0) {
    const current = entries[0];
    const deleted = current.deleted.splice(0, remainingLimit);
    remainingLimit -= deleted.length;
    const entities = remainingLimit > 0 ? current.entities.splice(0, remainingLimit) : [];
    remainingLimit -= entities.length;

    const existing = map[current.id] ?? {};
    map[current.id] = {
      deletedGameEntityGuids: [
        ...(existing.deletedGameEntityGuids ?? []),
        ...deleted,
      ],
      gameEntities: [
        ...(existing.gameEntities ?? []),
        ...entities,
      ],
    };

    if (current.deleted.length === 0 && current.entities.length === 0) {
      entries.shift();
      tileStatuses[current.id] = current.status;
    }
  }

  return {
    state: {entries},
    response: {result: {map}},
    tileStatuses,
  };
}
