import { useStore, ArtifactParser, ArtifactData } from '@iris/core';

export function handleArtifacts(data: ArtifactData): void {
  const artifacts = ArtifactParser.parse(data);
  const { updateArtifacts, updatePortals } = useStore.getState();
  const artifactPortals = Array.from(new Map(artifacts
    .filter((artifact) => typeof artifact.lat === 'number' && typeof artifact.lng === 'number')
    .map((artifact) => [artifact.portalId, {
      id: artifact.portalId,
      lat: artifact.lat,
      lng: artifact.lng,
      team: artifact.team,
      level: artifact.level,
      health: artifact.health,
      name: artifact.name,
      ornaments: artifact.ornaments,
    }])).values());
  if (artifactPortals.length > 0) {
    updatePortals(artifactPortals);
  }
  if (updateArtifacts) {
    updateArtifacts(artifacts);
  }
}
