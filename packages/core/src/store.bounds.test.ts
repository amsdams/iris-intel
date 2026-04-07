import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('updateMapState', () => {
  beforeEach(async () => {
    localStorage.clear();
    useStore.persist.clearStorage();
    await useStore.persist.rehydrate();
    useStore.setState((state) => ({
      ...state,
      mapState: {
        lat: 0,
        lng: 0,
        zoom: 2,
        bounds: undefined,
      },
    }));
  });

  it('preserves existing bounds when an update omits bounds', () => {
    const initialBounds = {
      minLatE6: 1,
      minLngE6: 2,
      maxLatE6: 3,
      maxLngE6: 4,
    };

    useStore.getState().updateMapState(10, 20, 12, initialBounds);
    expect(useStore.getState().mapState.bounds).toEqual(initialBounds);

    useStore.getState().updateMapState(11, 21, 13);

    expect(useStore.getState().mapState.lat).toBe(11);
    expect(useStore.getState().mapState.lng).toBe(21);
    expect(useStore.getState().mapState.zoom).toBe(13);
    expect(useStore.getState().mapState.bounds).toEqual(initialBounds);
  });
});
