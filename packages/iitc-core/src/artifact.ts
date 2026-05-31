export interface IitcArtifactBrief {
  fragment: Record<string, unknown[]>;
  target: Record<string, unknown[]>;
}

export interface IitcPortalArtifact {
  role: 'fragment' | 'target';
  type: string;
  ids: string[];
}

function decodeArtifactArray(values: unknown[]): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};

  for (const value of values) {
    if (!Array.isArray(value) || typeof value[0] !== 'string') continue;
    result[value[0]] = value.slice(1);
  }

  return result;
}

function artifactIdsFromValue(value: unknown[]): string[] {
  const flattened: unknown[] = [];
  for (const entry of value) {
    if (Array.isArray(entry)) flattened.push(...entry);
    else flattened.push(entry);
  }
  return flattened.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function parseIitcArtifactBrief(value: unknown): IitcArtifactBrief | null {
  if (!Array.isArray(value) || !Array.isArray(value[0]) || !Array.isArray(value[1])) return null;

  return {
    fragment: decodeArtifactArray(value[0]),
    target: decodeArtifactArray(value[1]),
  };
}

export function getIitcPortalArtifacts(artifactBrief: IitcArtifactBrief | null | undefined): IitcPortalArtifact[] {
  if (!artifactBrief) return [];

  const artifacts: IitcPortalArtifact[] = [];
  for (const [type, value] of Object.entries(artifactBrief.fragment)) {
    artifacts.push({role: 'fragment', type, ids: artifactIdsFromValue(value)});
  }
  for (const [type, value] of Object.entries(artifactBrief.target)) {
    artifacts.push({role: 'target', type, ids: artifactIdsFromValue(value)});
  }

  return artifacts;
}
