import { Artifact, ArtifactData } from './types';

export function parseArtifacts(data: ArtifactData): Artifact[] {
  const artifacts: Artifact[] = [];

  if (!data.result || !Array.isArray(data.result)) return artifacts;

  data.result.forEach((entry) => {
    const [portalId, , artifactInfo] = entry;
    if (!portalId || !artifactInfo) return;

    const [type, ids] = artifactInfo;
    if (!type || !ids || !Array.isArray(ids)) return;

    artifacts.push({
      portalId,
      type,
      ids
    });
  });

  return artifacts;
}
