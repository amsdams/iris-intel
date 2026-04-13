import { useStore } from '@iris/core';
import { InventoryData } from './types';
import { parseInventory } from './parser';

export function handleInventory(data: InventoryData): void {
  const inventory = parseInventory(data);
  useStore.getState().setHasSubscription(true);
  useStore.getState().setInventory(inventory);
}
