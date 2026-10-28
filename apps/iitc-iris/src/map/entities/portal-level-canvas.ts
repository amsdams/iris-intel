import L from 'leaflet';

interface LevelLabelOptions extends L.CircleMarkerOptions {
  levelLabel: number;
}

interface ProjectedLevelLabel extends L.CircleMarker {
  options: LevelLabelOptions;
  _point: L.Point;
  _empty: () => boolean;
}

const GLYPH_SIZE = 36;

/** Leaflet 1.9 Canvas drawing adapter; keep its private renderer seam isolated here. */
class PortalLevelCanvas extends L.Canvas {
  declare _ctx: CanvasRenderingContext2D | undefined;
  declare _drawing: boolean;
  private readonly glyphs = new Map<number, HTMLCanvasElement>();

  _updateCircle(layer: ProjectedLevelLabel): void {
    if (!this._drawing || !this._ctx || layer._empty()) return;
    const glyph = this.getGlyph(layer.options.levelLabel);
    this._ctx.drawImage(glyph, layer._point.x - GLYPH_SIZE / 2, layer._point.y - GLYPH_SIZE / 2, GLYPH_SIZE, GLYPH_SIZE);
  }

  private getGlyph(level: number): HTMLCanvasElement {
    const cached = this.glyphs.get(level);
    if (cached) return cached;
    const glyph = document.createElement('canvas');
    const scale = L.Browser.retina ? 2 : 1;
    glyph.width = glyph.height = GLYPH_SIZE * scale;
    const ctx = glyph.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable for portal level labels');
    ctx.scale(scale, scale);
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.shadowColor = '#000';
    // Match the existing CSS shadows, rasterizing each level once instead of on each frame.
    for (const blur of [10, 2, 1]) {
      ctx.shadowBlur = blur * scale;
      ctx.fillText(String(level), GLYPH_SIZE / 2, GLYPH_SIZE / 2 + 3);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffb';
    ctx.fillText(String(level), GLYPH_SIZE / 2, GLYPH_SIZE / 2 + 3);
    this.glyphs.set(level, glyph);
    return glyph;
  }
}

export function createPortalLevelCanvas(pane: string): L.Canvas {
  const renderer = new PortalLevelCanvas({pane});
  renderer.on('add', () => {
    renderer.getPane()?.querySelector('canvas')?.classList.add('iitc-iris-level-labels-canvas');
  });
  return renderer;
}

export function createPortalLevelLabel(
  latLng: [number, number], level: number, team: string, renderer: L.Canvas,
): L.CircleMarker {
  const options: LevelLabelOptions = {
    renderer, pane: renderer.options.pane,
    className: `iitc-iris-level-label iitc-iris-level-label-${team}`,
    levelLabel: level, radius: GLYPH_SIZE / 2, stroke: false, fill: false, interactive: false,
  };
  return L.circleMarker(latLng, options);
}
