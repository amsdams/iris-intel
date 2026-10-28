import L from 'leaflet';
import {IitcIrisCanvas} from '../map-canvas';

export interface PortalImage {
  url: string;
  size: number;
  anchorX: number;
  anchorY: number;
  opacity: number;
  zIndexOffset: number;
  order: number;
}

interface ImageLayer extends L.CircleMarker {
  options: L.CircleMarkerOptions & {portalImage: PortalImage};
  _point: L.Point;
  _pxBounds: L.Bounds;
  _empty: () => boolean;
  _updatePath: () => void;
}

interface CachedImage {
  image: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
  users: Set<ImageLayer>;
}

/** Passive image overlays; Leaflet 1.9 projection/clipping/drawing internals stay isolated here. */
class PortalImageCanvas extends IitcIrisCanvas {
  declare _ctx: CanvasRenderingContext2D | undefined;
  declare _container: HTMLCanvasElement;
  declare _drawing: boolean;
  declare _layers: Record<string, ImageLayer>;
  declare _redrawBounds: L.Bounds | null;
  declare _requestRedraw: (layer: ImageLayer) => void;
  private readonly images = new Map<string, CachedImage>();
  private readonly unused = new Set<string>();

  acquire(layer: ImageLayer): void {
    const url = layer.options.portalImage.url;
    this.unused.delete(url);
    let cached = this.images.get(url);
    if (!cached) {
      cached = {image: new Image(), loaded: false, failed: false, users: new Set()};
      const entry = cached;
      this.images.set(url, entry);
      // Keep the same remote-image permissions as the previous <img> markers. The image canvas
      // may be tainted by cross-origin assets; display needs no pixel readback or canvas export.
      entry.image.onload = (): void => {
        entry.loaded = true;
        if (this.images.get(url) !== entry || !this._ctx) return;
        for (const user of entry.users) this._requestRedraw(user);
      };
      entry.image.onerror = (): void => { entry.failed = true; };
      entry.users.add(layer);
      entry.image.src = url;
    } else {
      cached.users.add(layer);
    }
  }

  release(layer: ImageLayer): void {
    const url = layer.options.portalImage.url;
    const cached = this.images.get(url);
    if (!cached) return;
    cached.users.delete(layer);
    // Drop failed/in-flight unused images: toggling the overlay can retry, and late loads
    // cannot revive removed decorations. Keep at most 128 unused, decoded URLs per map.
    if (!cached.users.size && (!cached.loaded || cached.failed)) this.dropImage(url, cached);
    if (!cached.users.size && this.images.has(url)) this.unused.add(url);
    while (this.unused.size > 128) {
      const key = this.unused.values().next().value;
      if (key === undefined) break;
      this.unused.delete(key);
      const entry = this.images.get(key);
      if (entry) this.dropImage(key, entry);
    }
  }

  disposeImages(): void {
    for (const [url, entry] of this.images) this.dropImage(url, entry);
  }

  private dropImage(url: string, entry: CachedImage): void {
    entry.image.onload = entry.image.onerror = null;
    entry.users.clear();
    this.images.delete(url);
    this.unused.delete(url);
  }

  _draw(): void {
    const ctx = this._ctx;
    if (!ctx) return;
    const bounds = this._redrawBounds;
    ctx.save();
    if (bounds) {
      const size = bounds.getSize();
      const min = bounds.getTopLeft();
      ctx.beginPath();
      ctx.rect(min.x, min.y, size.x, size.y);
      ctx.clip();
    }
    this._drawing = true;
    // Image markers used screen-y + zIndexOffset stacking. Sort only visible redraw
    // candidates; ties follow entity order, including after retained layers change neighbours.
    const visible = Object.values(this._layers).filter(layer => !layer._empty() &&
      (!bounds || layer._pxBounds.intersects(bounds)));
    visible.sort((a, b) => a._point.y + a.options.portalImage.zIndexOffset -
      b._point.y - b.options.portalImage.zIndexOffset || a.options.portalImage.order - b.options.portalImage.order);
    for (const layer of visible) layer._updatePath();
    this._drawing = false;
    ctx.restore();
  }

  _updateCircle(layer: ImageLayer): void {
    if (!this._drawing || !this._ctx || layer._empty()) return;
    const options = layer.options.portalImage;
    const cached = this.images.get(options.url);
    if (!cached?.loaded || cached.failed) return;
    this._ctx.save();
    this._ctx.globalAlpha = options.opacity;
    this._ctx.drawImage(cached.image, layer._point.x - options.anchorX, layer._point.y - options.anchorY,
      options.size, options.size);
    this._ctx.restore();
  }
}

export function createPortalImageCanvas(pane: string, className: string): L.Canvas {
  const renderer = new PortalImageCanvas({pane});
  renderer.on('add', () => {
    renderer._container.classList.add(className);
    renderer._container.style.pointerEvents = 'none';
  });
  renderer.on('remove', () => renderer.disposeImages());
  return renderer;
}

export function createPortalImage(latLng: [number, number], image: PortalImage, renderer: L.Canvas): L.CircleMarker {
  const options: L.CircleMarkerOptions & {portalImage: PortalImage} = {
    renderer, pane: renderer.options.pane, portalImage: image,
    // The square bound must include the entire image, including non-centred anchors.
    radius: Math.ceil(Math.max(Math.abs(image.anchorX), Math.abs(image.anchorY),
      Math.abs(image.size - image.anchorX), Math.abs(image.size - image.anchorY))),
    stroke: false, fill: false, interactive: false,
  };
  const layer = L.circleMarker(latLng, options) as ImageLayer;
  layer.on('add', () => (renderer as PortalImageCanvas).acquire(layer));
  layer.on('remove', () => (renderer as PortalImageCanvas).release(layer));
  return layer;
}
