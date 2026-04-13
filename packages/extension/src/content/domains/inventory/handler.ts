import { useStore } from '@iris/core';
import { InventoryData } from './types';
import { parseInventory } from './parser';

export function handleInventory(data: InventoryData): void {
  const previousInventory = useStore.getState().inventory;
  const inventory = parseInventory(data);
  useStore.getState().setHasSubscription(true);

  if (data.result && data.result.length === 0 && previousInventory.length > 0) {
    console.warn('IRIS: Ignoring empty inventory response and keeping previous inventory snapshot');
    return;
  }

  useStore.getState().setInventory(inventory);
}
