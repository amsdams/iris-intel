import { useStore, ArtifactParser, ArtifactData } from '@iris/core';

export function handleArtifacts(data: ArtifactData): void {
  const artifacts = ArtifactParser.parse(data);
  const { updateArtifacts } = useStore.getState();
  if (updateArtifacts) {
    updateArtifacts(artifacts);
  }
}
