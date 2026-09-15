import {describe, expect, it} from 'vitest';
import {calculateNextSortOrder} from './content-portal-analysis-actions';

describe('content-portal-analysis-actions', () => {
  it('toggles sort order when clicking the current sort field', () => {
    expect(calculateNextSortOrder('level', 'level', -1)).toEqual({
      nextField: 'level',
      nextOrder: 1,
    });
    expect(calculateNextSortOrder('level', 'level', 1)).toEqual({
      nextField: 'level',
      nextOrder: -1,
    });
  });

  it('sets default sort order when switching to title or team', () => {
    expect(calculateNextSortOrder('title', 'level', -1)).toEqual({
      nextField: 'title',
      nextOrder: 1,
    });
    expect(calculateNextSortOrder('team', 'level', -1)).toEqual({
      nextField: 'team',
      nextOrder: 1,
    });
  });

  it('sets descending sort order when switching to level or health', () => {
    expect(calculateNextSortOrder('level', 'title', 1)).toEqual({
      nextField: 'level',
      nextOrder: -1,
    });
  });
});
