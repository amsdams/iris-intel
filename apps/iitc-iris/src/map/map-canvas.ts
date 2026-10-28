import L from 'leaflet';

const canvasPrototype = L.Canvas.prototype as L.Canvas & {_redraw: () => void};

/** Leaflet 1.9 renderer seam: a synchronous redraw must also consume its queued frame. */
export class IitcIrisCanvas extends L.Canvas {
  declare _redrawRequest: number | null | undefined;
  declare _ctx: CanvasRenderingContext2D | undefined;

  _redraw(): void {
    // Leaflet's _updatePaths can redraw synchronously while an earlier frame is queued.
    // Its _redraw clears the handle without cancelling that frame, so onRemove loses it.
    if (this._redrawRequest !== undefined && this._redrawRequest !== null) {
      L.Util.cancelAnimFrame(this._redrawRequest);
    }
    this._redrawRequest = null;
    if (this._ctx) canvasPrototype._redraw.call(this);
  }
}

/** Include implicit pane renderers used by drawings, missions and selection paths. */
export class IitcIrisCanvasMap extends L.Map {
  _createRenderer(options?: L.RendererOptions): L.Renderer {
    return this.options.preferCanvas && L.Browser.canvas ? new IitcIrisCanvas(options) : L.svg(options);
  }
}
