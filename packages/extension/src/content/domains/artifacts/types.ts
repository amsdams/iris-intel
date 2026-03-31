export interface ArtifactData {
  result?: [string, number, [string, string[]]][];
}

export interface Artifact {
  portalId: string;
  type: string;
  ids: string[];
}
