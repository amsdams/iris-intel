import { useStore } from '@iris/core';
import { parseArtifacts } from './parser';
import { ArtifactData } from './types';

export function handleArtifacts(data: ArtifactData): void {
  const artifacts = parseArtifacts(data);
  const { updateArtifacts } = useStore.getState();
  if (updateArtifacts) {
    updateArtifacts(artifacts);
  }
}
