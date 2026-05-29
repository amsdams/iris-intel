import { ArtifactData, ArtifactPortalSummary } from './intel-types';
import { Artifact } from '../store';
import { normalizeTeam } from '../team';

function idsFromArtifactEntry(entry: [string, ...unknown[]]): string[] {
  const ids = entry.slice(1)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  return ids.length > 0 ? ids : [entry[0]];
}

function parseArtifactBriefPortal(portalId: string, summary: ArtifactPortalSummary): Artifact[] {
  const lat = Number(summary[2]) / 1e6;
  const lng = Number(summary[3]) / 1e6;
  const artifactBrief = summary[12];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Array.isArray(artifactBrief)) return [];

  const common = {
    portalId,
    lat,
    lng,
    team: normalizeTeam(summary[1]),
    level: Number(summary[4]) || 0,
    health: Number(summary[5]) || 0,
    name: typeof summary[8] === 'string' ? summary[8] : undefined,
    ornaments: Array.isArray(summary[9]) ? summary[9] : undefined,
  };

  const fragments = Array.isArray(artifactBrief[0]) ? artifactBrief[0] : [];
  const targets = Array.isArray(artifactBrief[1]) ? artifactBrief[1] : [];

  return [
    ...fragments.map((entry) => ({
      ...common,
      type: entry[0],
      ids: idsFromArtifactEntry(entry),
    })),
    ...targets.map((entry) => ({
      ...common,
      type: `${entry[0]}-target`,
      ids: idsFromArtifactEntry(entry),
    })),
  ].filter((artifact) => artifact.type);
}

export const ArtifactParser = {
  parse: (data: ArtifactData): Artifact[] => {
    const artifacts: Artifact[] = [];

    if (!data.result) return artifacts;

    if (!Array.isArray(data.result)) {
      Object.entries(data.result).forEach(([portalId, summary]) => {
        if (!portalId || !Array.isArray(summary) || summary[0] !== 'p') return;
        artifacts.push(...parseArtifactBriefPortal(portalId, summary));
      });
      return artifacts;
    }

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
};
