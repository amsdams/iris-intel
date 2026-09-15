import type {PortalsListSortField, SortOrder} from './content-portal-analysis';

export function calculateNextSortOrder(
  field: PortalsListSortField,
  currentField: PortalsListSortField,
  currentOrder: SortOrder
): {nextField: PortalsListSortField; nextOrder: SortOrder} {
  if (currentField === field) {
    return {
      nextField: field,
      nextOrder: currentOrder === 1 ? -1 : 1,
    };
  }
  return {
    nextField: field,
    nextOrder: field === 'title' || field === 'team' ? 1 : -1,
  };
}
