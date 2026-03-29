import { InventoryItem } from '@iris/core';
import { InventoryData } from './types';

export function parseInventory(data: InventoryData): InventoryItem[] {
  if (!data.result) return [];

  try {
    return data.result.map((item) => {
      const [guid, timestamp, itemData] = item;
      return {
        guid,
        timestamp,
        ...(itemData as object),
      } as InventoryItem;
    });
  } catch (error) {
    console.error('IRIS: Error parsing inventory', error, data);
    return [];
  }
}
