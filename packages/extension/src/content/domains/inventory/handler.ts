import { useStore, InventoryParser, InventoryData } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handleInventory(data: InventoryData): void {
  const previousInventory = useStore.getState().inventory;
  const inventory = InventoryParser.parse(data, {
    onError: (error) => reportDomainError('inventory', error, `items: ${data.result?.length ?? 0}`),
  });
  useStore.getState().setHasSubscription(true);

  if (data.result && data.result.length === 0 && previousInventory.length > 0) {
    console.warn('IRIS: Ignoring empty inventory response and keeping previous inventory snapshot');
    return;
  }

  useStore.getState().setInventory(inventory);
}
