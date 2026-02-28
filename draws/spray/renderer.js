/**
 * Draw Theme: Spray Paint
 * Concrete wall texture (cached on bgCanvas) with random dot spray effect
 * Includes spray mist and paint drip effects
 */
;(function() {
  'use strict';

  // Deterministic hash for stable texture
  function hash(a, b) {
    return (((a * 2654435761 + b * 2246822519) >>> 0) & 0xffff) / 0xffff;
  }

  var theme = {
    id: 'spray',
    defaults: { color: 'ff0000', bg: '808080', size: 20, opacity: 1, smooth: 2, density: 5, scatter: 5 },
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

      container.style.background = '#' + (config.bg || '808080');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for wall texture (cached)
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
      this._renderWall();
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
      this._renderWall();
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

    _renderWall: function() {
      var ctx = this._bgCanvas.getContext('2d');
      var w = this._bgCanvas.width;
      var h = this._bgCanvas.height;

      // Base color
      ctx.fillStyle = '#' + (this._config.bg || '808080');
      ctx.fillRect(0, 0, w, h);

      // Deterministic concrete texture noise
      var imageData = ctx.getImageData(0, 0, w, h);
      var data = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var noise = (hash(x, y) - 0.5) * 20;
          data[idx] += noise;
          data[idx + 1] += noise;
          data[idx + 2] += noise;
        }
      }
      ctx.putImageData(imageData, 0, 0);
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

      var density = parseFloat(this._config.density) || 5;
      var scatter = parseFloat(this._config.scatter) || 5;
      var color = this._config.color || 'ff0000';
      var size = parseFloat(this._config.size) || 20;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;
      var radius = size * scatter / 5;
      var dotCount = Math.floor(density * 3);

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.fillStyle = '#' + (stroke.eraser ? '000' : color);

      for (var i = 0; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        var cx = p.x * cw;
        var cy = p.y * ch;

        // Spray mist — larger, lower alpha background
        if (!stroke.eraser) {
          ctx.globalAlpha = opacity * 0.05;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main spray dots — deterministic positions
        for (var d = 0; d < dotCount; d++) {
          var h1 = hash(strokeIdx * 10000 + i * 100 + d, d * 7 + i * 13);
          var h2 = hash(d * 11 + i * 17, strokeIdx * 10000 + i * 100 + d * 3);
          var angle = h1 * Math.PI * 2;
          var dist = h2 * radius;
          var dx = cx + Math.cos(angle) * dist;
          var dy = cy + Math.sin(angle) * dist;
          var dotSize = hash(i * 31 + d, strokeIdx * 37) * 2 + 0.5;
          ctx.globalAlpha = opacity * (1 - dist / radius) * 0.8;
          ctx.beginPath();
          ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Paint drip — when consecutive points are very close
        if (!stroke.eraser && i > 0) {
          var prev = stroke.points[i - 1];
          var ddx = (p.x - prev.x) * cw;
          var ddy = (p.y - prev.y) * ch;
          var dist2 = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist2 < size * 0.3) {
            var dripLen = size * (0.5 + hash(i, strokeIdx * 53) * 0.5);
            ctx.globalAlpha = opacity * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + (hash(i * 7, strokeIdx) - 0.5) * 2, cy + dripLen);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#' + color;
            ctx.stroke();
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
