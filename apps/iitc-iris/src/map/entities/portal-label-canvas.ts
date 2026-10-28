import L from 'leaflet';
import {IitcIrisCanvas} from '../map-canvas';

interface PortalLabelOptions extends L.CircleMarkerOptions {
  levelLabel?: number;
  keyCountLabel?: number;
  portalRadius?: number;
}

interface ProjectedPortalLabel extends L.CircleMarker {
  options: PortalLabelOptions;
  _point: L.Point;
  _empty: () => boolean;
}

const GLYPH_SIZE = 36;

/** Leaflet 1.9 Canvas drawing adapter; keep its private renderer seam isolated here. */
class PortalLabelCanvas extends IitcIrisCanvas {
  declare _ctx: CanvasRenderingContext2D | undefined;
  declare _drawing: boolean;
  declare _container: HTMLCanvasElement;
  private keyFont?: string;
  private readonly keyGlyphs = new Map<number, {canvas: HTMLCanvasElement; width: number}>();
  private readonly glyphs = new Map<number, HTMLCanvasElement>();

  _updateCircle(layer: ProjectedPortalLabel): void {
    if (!this._drawing || !this._ctx || layer._empty()) return;
    if (layer.options.keyCountLabel !== undefined) {
      const glyph = this.getKeyGlyph(layer.options.keyCountLabel);
      this._ctx.drawImage(glyph.canvas, layer._point.x + 1 - glyph.width / 2,
        layer._point.y - (layer.options.portalRadius ?? 0) - 12, glyph.width, 16);
      return;
    }
    if (layer.options.levelLabel === undefined) return;
    const glyph = this.getGlyph(layer.options.levelLabel);
    this._ctx.drawImage(glyph, layer._point.x - GLYPH_SIZE / 2, layer._point.y - GLYPH_SIZE / 2, GLYPH_SIZE, GLYPH_SIZE);
  }

  private getKeyGlyph(count: number): {canvas: HTMLCanvasElement; width: number} {
    const cached = this.keyGlyphs.get(count);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable for key-count labels');
    if (!this.keyFont) {
      const style = getComputedStyle(document.documentElement);
      this.keyFont = `${style.getPropertyValue('--iitc-iris-font-extrabold').trim() || '800'} ${
        style.getPropertyValue('--iitc-iris-text-sm').trim() || '10px'} ${
        style.getPropertyValue('--iitc-iris-font-ui').trim() || 'sans-serif'}`;
    }
    ctx.font = this.keyFont;
    // Preserve the 20×14 content box + 1px border; long counts may overflow the badge as before.
    const width = Math.max(22, Math.ceil(ctx.measureText(String(count)).width) + 2);
    const scale = L.Browser.retina ? 2 : 1;
    canvas.width = width * scale;
    canvas.height = 16 * scale;
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.roundRect(width / 2 - 10.5, 0.5, 21, 15, 3.5);
    ctx.fillStyle = 'rgba(2, 10, 16, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = this.keyFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(count), width / 2, 8);
    // Counts are unbounded, unlike the eight level glyphs; cap the per-map cache.
    if (this.keyGlyphs.size >= 128) {
      const oldest = this.keyGlyphs.keys().next().value;
      if (oldest !== undefined) this.keyGlyphs.delete(oldest);
    }
    const glyph = {canvas, width};
    this.keyGlyphs.set(count, glyph);
    return glyph;
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
  return createLabelCanvas(pane, 'iitc-iris-level-labels-canvas');
}

export function createPortalLevelLabel(
  latLng: [number, number], level: number, team: string, renderer: L.Canvas,
): L.CircleMarker {
  const options: PortalLabelOptions = {
    renderer, pane: renderer.options.pane,
    className: `iitc-iris-level-label iitc-iris-level-label-${team}`,
    levelLabel: level, radius: GLYPH_SIZE / 2, stroke: false, fill: false, interactive: false,
  };
  return L.circleMarker(latLng, options);
}

export function createPortalKeyCountCanvas(pane: string): L.Canvas {
  return createLabelCanvas(pane, 'iitc-iris-key-counts-canvas');
}

function createLabelCanvas(pane: string, className: string): L.Canvas {
  const renderer = new PortalLabelCanvas({pane});
  renderer.on('add', () => {
    renderer._container.classList.add(className);
    // Keep key badges above levels regardless of which overlay was enabled first.
    if (className === 'iitc-iris-level-labels-canvas') {
      const keyCanvas = renderer.getPane()?.querySelector('.iitc-iris-key-counts-canvas');
      if (keyCanvas) renderer.getPane()?.insertBefore(renderer._container, keyCanvas);
    }
  });
  return renderer;
}

export function createPortalKeyCountLabel(
  latLng: [number, number], count: number, portalRadius: number, renderer: L.Canvas,
): L.CircleMarker {
  const options: PortalLabelOptions = {
    renderer, pane: renderer.options.pane, className: 'iitc-iris-key-count-label',
    keyCountLabel: count, portalRadius,
    // Include the offset badge and overflowing digits in redraw/clipping bounds.
    radius: Math.ceil(Math.max(portalRadius + 12, String(count).length * 10)),
    stroke: false, fill: false, interactive: false,
  };
  return L.circleMarker(latLng, options);
}
