/**
 * Draw Theme: Chalkboard
 * Dark green/black board with deterministic texture, chalk tray,
 * intermittent chalk strokes, and elliptical dust particles
 */
;(function() {
  'use strict';

  // Deterministic hash for stable texture across redraws
  function hash(a, b) {
    return (((a * 2654435761 + b * 2246822519) >>> 0) & 0xffff) / 0xffff;
  }

  var theme = {
    id: 'chalk',
    defaults: { color: 'ffffff', bg: '2d5a27', size: 6, opacity: 1, smooth: 3, roughness: 5, dust: 3 },
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

      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for chalkboard texture
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
      this._renderBoard();
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
      this._renderBoard();
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

    _renderBoard: function() {
      var ctx = this._bgCanvas.getContext('2d');
      var w = this._bgCanvas.width;
      var h = this._bgCanvas.height;

      // Base color
      ctx.fillStyle = '#' + (this._config.bg || '2d5a27');
      ctx.fillRect(0, 0, w, h);

      // Deterministic texture noise using hash
      var imageData = ctx.getImageData(0, 0, w, h);
      var data = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var noise = (hash(x, y) - 0.5) * 15;
          data[idx] += noise;
          data[idx + 1] += noise;
          data[idx + 2] += noise;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Wooden frame border
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      // Chalk tray at bottom
      var trayH = 14;
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(8, h - trayH - 4, w - 16, trayH);
      // Tray highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(8, h - trayH - 4, w - 16, 2);
      // Tray shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(8, h - 4 - 2, w - 16, 2);
    },

    _renderAll: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      if (!this._engine) return;
      var strokes = this._engine.getStrokes();
      for (var i = 0; i < strokes.length; i++) {
        this._drawStroke(ctx, strokes[i], cw, ch, i);
      }
    },

    _renderLive: function(stroke) {
      this._renderAll();
      if (stroke) {
        this._drawStroke(this._ctx, stroke, this._canvas.width, this._canvas.height, 9999);
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch, strokeIdx) {
      if (stroke.points.length < 1) return;

      var roughness = parseFloat(this._config.roughness) || 5;
      var dust = parseFloat(this._config.dust) || 3;
      var color = this._config.color || 'ffffff';
      var size = parseFloat(this._config.size) || 6;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.strokeStyle = '#' + (stroke.eraser ? '000' : color);
      ctx.fillStyle = '#' + (stroke.eraser ? '000' : color);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Chalk intermittent texture — draw in small segments with varying alpha
      var points = stroke.points;
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i];
        var p1 = points[i + 1];

        // Per-segment alpha variation — simulates chalk hitting bumps (50%-100%)
        var segAlpha = stroke.eraser ? 1 : opacity * (0.5 + 0.5 * hash(strokeIdx * 1000 + i, i * 7));
        ctx.globalAlpha = segAlpha;
        ctx.lineWidth = size * (0.85 + 0.3 * hash(i * 3, strokeIdx * 11));

        ctx.beginPath();
        ctx.moveTo(p0.x * cw, p0.y * ch);
        ctx.lineTo(p1.x * cw, p1.y * ch);
        ctx.stroke();
      }

      // Single point
      if (points.length === 1) {
        ctx.globalAlpha = stroke.eraser ? 1 : opacity * 0.85;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(points[0].x * cw, points[0].y * ch);
        ctx.lineTo(points[0].x * cw + 0.1, points[0].y * ch + 0.1);
        ctx.stroke();
      }

      // Chalk dust particles — elliptical, gravity-biased downward
      if (!stroke.eraser && dust > 0) {
        ctx.globalAlpha = 0.25;
        var numDust = Math.floor(dust * 0.5);
        for (var j = 0; j < points.length; j += 3) {
          var pt = points[j];
          for (var d = 0; d < numDust; d++) {
            var ox = (hash(strokeIdx * 100 + j * 10 + d, d * 7) - 0.5) * size * roughness * 0.3;
            // Gravity bias: more dust below the stroke
            var oy = (hash(d * 11 + j, strokeIdx * 100 + j * 10 + d * 3) - 0.3) * size * roughness * 0.3;
            // Elliptical dust particle
            ctx.save();
            ctx.translate(pt.x * cw + ox, pt.y * ch + oy);
            ctx.scale(1.5, 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
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
