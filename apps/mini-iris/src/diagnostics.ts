export interface MiniRenderStats {
    totalFeatures: number;
    portalCount: number;
    linkCount: number;
    fieldCount: number;
    keyLabelCount: number;
    playerFeatureCount: number;
    queryItemCount: number;
    renderMs: number;
    minLevel: number;
    liveMode: boolean;
    patternMode: number;
    updatedAt: number;
}

export interface MiniFrameStats {
    avgMs: number;
    maxMs: number;
    fps: number;
    slowFrames: number;
    sampleCount: number;
    updatedAt: number;
}

