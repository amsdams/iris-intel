interface PortalLevelPoint {
  guid: string;
  level: number;
  point: {x: number; y: number};
}

const SQUARE_SIZE = 15;

/** Keep the existing higher-level/GUID priority, testing only neighbouring spatial buckets. */
export function getVisibleLevelLabelGuids(candidates: readonly PortalLevelPoint[]): Set<string> {
  const sorted = [...candidates].sort((a, b) => b.level - a.level || a.guid.localeCompare(b.guid));
  const visible = new Set<string>();
  // At most one kept point can occupy a bucket: any two within it would overlap.
  const buckets = new Map<string, PortalLevelPoint['point']>();
  for (const candidate of sorted) {
    const {point} = candidate;
    const x = Math.floor(point.x / SQUARE_SIZE);
    const y = Math.floor(point.y / SQUARE_SIZE);
    let overlaps = false;
    for (let dx = -1; dx <= 1 && !overlaps; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const kept = buckets.get(`${x + dx},${y + dy}`);
        if (kept && Math.abs(kept.x - point.x) <= SQUARE_SIZE && Math.abs(kept.y - point.y) <= SQUARE_SIZE) {
          overlaps = true;
          break;
        }
      }
    }
    if (overlaps) continue;
    visible.add(candidate.guid);
    buckets.set(`${x},${y}`, point);
  }
  return visible;
}
