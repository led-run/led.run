/**
 * Draw Theme: Calligraphy (Ink on Rice Paper)
 * Rice paper texture on bgCanvas, trapezoid-strip brush strokes (no circle artifacts),
 * ink blob at stroke start and tail at stroke end
 */
;(function() {
  'use strict';

  // Deterministic hash for stable fiber pattern
  function hash(a, b) {
    return (((a * 2654435761 + b * 2246822519) >>> 0) & 0xffff) / 0xffff;
  }

  var theme = {
    id: 'calligraphy',
    defaults: { color: '1a1a1a', bg: 'f5f0e0', size: 8, opacity: 0.9, smooth: 4, pressure: 5, ink: 5 },
    _canvas: null,
    _bgCanvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _resizeHandler: null,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;

      container.style.background = '#' + (config.bg || 'f5f0e0');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for rice paper texture
      var bgCanvas = document.createElement('canvas');
      bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      container.appendChild(bgCanvas);
      this._bgCanvas = bgCanvas;

      // Drawing canvas
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      this._resize();
      this._renderPaper();
      this._renderAll();

      var self = this;
      this._resizeHandler = function() { self._onResize(); };
      window.addEventListener('resize', this._resizeHandler);

      if (drawEngine) {
        drawEngine.onStroke = function() { self._renderAll(); };
        drawEngine.onStrokeUpdate = function(stroke) { self._renderLive(stroke); };
      }
    },

    _onResize: function() {
      this._resize();
      this._renderPaper();
      this._renderAll();
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      this._canvas.width = w;
      this._canvas.height = h;
      this._bgCanvas.width = w;
      this._bgCanvas.height = h;
    },

    _renderPaper: function() {
      var ctx = this._bgCanvas.getContext('2d');
      var w = this._bgCanvas.width;
      var h = this._bgCanvas.height;

      // Base rice paper color
      ctx.fillStyle = '#' + (this._config.bg || 'f5f0e0');
      ctx.fillRect(0, 0, w, h);

      // Horizontal fiber lines — irregular spacing simulates real xuan paper
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 0.5;
      var y = 0;
      var lineIdx = 0;
      while (y < h) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        // Irregular spacing 3-6px using hash
        y += 3 + hash(lineIdx, 42) * 3;
        lineIdx++;
      }
    },

    _renderAll: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      if (!this._engine) return;
      var strokes = this._engine.getStrokes();
      for (var i = 0; i < strokes.length; i++) {
        this._drawStroke(ctx, strokes[i], cw, ch);
      }
    },

    _renderLive: function(stroke) {
      this._renderAll();
      if (stroke) {
        this._drawStroke(this._ctx, stroke, this._canvas.width, this._canvas.height);
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch) {
      var color = this._config.color || '1a1a1a';
      var size = parseFloat(this._config.size) || 8;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 0.9;
      var pressure = (parseFloat(this._config.pressure) || 5) / 5;
      var ink = (parseFloat(this._config.ink) || 5) / 5;

      if (stroke.points.length < 1) return;

      ctx.save();
      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.fillStyle = '#' + (stroke.eraser ? '000' : color);

      if (stroke.points.length === 1) {
        var p = stroke.points[0];
        ctx.globalAlpha = stroke.eraser ? 1 : opacity;
        ctx.beginPath();
        ctx.arc(p.x * cw, p.y * ch, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // Compute widths based on speed
      var widths = [];
      for (var i = 0; i < stroke.points.length; i++) {
        var speed = 0;
        if (i > 0) {
          var prev = stroke.points[i - 1];
          var dx = (stroke.points[i].x - prev.x) * cw;
          var dy = (stroke.points[i].y - prev.y) * ch;
          speed = Math.sqrt(dx * dx + dy * dy);
        }
        var widthFactor = Math.max(0.3, 1 - speed * pressure * 0.05);
        widths.push(size * widthFactor / 2);
      }

      // Trapezoid strip rendering — connect adjacent points with quads
      for (var j = 0; j < stroke.points.length - 1; j++) {
        var p0 = stroke.points[j];
        var p1 = stroke.points[j + 1];
        var x0 = p0.x * cw, y0 = p0.y * ch;
        var x1 = p1.x * cw, y1 = p1.y * ch;
        var w0 = widths[j];
        var w1 = widths[j + 1];

        // Normal vector perpendicular to segment
        var sdx = x1 - x0;
        var sdy = y1 - y0;
        var len = Math.sqrt(sdx * sdx + sdy * sdy);
        if (len < 0.001) continue;
        var nx = -sdy / len;
        var ny = sdx / len;

        // Ink opacity varies with speed
        var speed2 = len;
        var alphaFactor = Math.max(0.5, 1 - speed2 * 0.01 * ink);
        ctx.globalAlpha = (stroke.eraser ? 1 : opacity) * alphaFactor;

        ctx.beginPath();
        ctx.moveTo(x0 + nx * w0, y0 + ny * w0);
        ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
        ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
        ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
        ctx.closePath();
        ctx.fill();
      }

      // Ink blob at stroke start (brush press)
      if (!stroke.eraser) {
        var start = stroke.points[0];
        ctx.globalAlpha = opacity * 0.8;
        ctx.beginPath();
        ctx.arc(start.x * cw, start.y * ch, size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Tail dot at stroke end (brush lift)
        var end = stroke.points[stroke.points.length - 1];
        ctx.globalAlpha = opacity * 0.6;
        ctx.beginPath();
        ctx.arc(end.x * cw, end.y * ch, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    destroy: function() {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._engine) {
        this._engine.onStroke = null;
        this._engine.onStrokeUpdate = null;
      }
      this._canvas = null;
      this._bgCanvas = null;
      this._ctx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
