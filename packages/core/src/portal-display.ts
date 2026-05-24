export type PortalHealthBucket = 25 | 50 | 75 | 100;

export function getPortalHealthBucket(health: number): PortalHealthBucket {
  if (health <= 25) return 25;
  if (health <= 50) return 50;
  if (health <= 75) return 75;
  return 100;
}

export function isPortalHealthBucketVisible(
  health: number | undefined,
  visibleBuckets: Record<number, boolean>,
): boolean {
  if (health === undefined) return true;
  return visibleBuckets[getPortalHealthBucket(health)] !== false;
}
