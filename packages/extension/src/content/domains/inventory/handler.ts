import { useStore } from '@iris/core';
import { InventoryData } from './types';
import { parseInventory } from './parser';

export function handleInventory(data: InventoryData): void {
  const inventory = parseInventory(data);
  if (inventory.length > 0) {
    useStore.getState().setInventory(inventory);
  }
}
