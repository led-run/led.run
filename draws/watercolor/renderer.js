/**
 * Draw Theme: Watercolor
 * Paper texture background with diffused, semi-transparent watercolor strokes
 * Background texture cached on bgCanvas — only redrawn on resize
 */
;(function() {
  'use strict';

  // Deterministic hash for stable wobble across redraws
  function hash(a, b) {
    return (((a * 2654435761 + b * 2246822519) >>> 0) & 0xffff) / 0xffff;
  }

  var theme = {
    id: 'watercolor',
    defaults: { color: '2266aa', bg: 'f5f0e8', size: 12, opacity: 0.4, smooth: 7, spread: 5, wetness: 5 },
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

      container.style.background = '#' + (config.bg || 'f5f0e8');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for paper texture (cached)
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

      // Base color
      ctx.fillStyle = '#' + (this._config.bg || 'f5f0e8');
      ctx.fillRect(0, 0, w, h);

      // Deterministic paper grain using hash
      var imageData = ctx.getImageData(0, 0, w, h);
      var data = imageData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          var noise = (hash(x, y) - 0.5) * 8;
          data[idx] += noise;
          data[idx + 1] += noise;
          data[idx + 2] += noise;
          data[idx + 3] = 30;
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
      var spread = (parseFloat(this._config.spread) || 5) / 5;
      var wetness = (parseFloat(this._config.wetness) || 5) / 5;
      var color = this._config.color || '2266aa';
      var size = parseFloat(this._config.size) || 12;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 0.4;

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity * 0.8;
      }

      // Multiple passes for watercolor diffusion effect
      var passes = stroke.eraser ? 1 : 3;
      for (var pass = 0; pass < passes; pass++) {
        var lineWidth = size * (1 + pass * spread * 0.4);
        var alpha = pass === 0 ? 1 : 0.3 / pass;
        ctx.globalAlpha = opacity * alpha;

        ctx.strokeStyle = '#' + (stroke.eraser ? '000' : color);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        var p0 = stroke.points[0];
        ctx.moveTo(p0.x * cw, p0.y * ch);

        if (stroke.points.length === 1) {
          ctx.lineTo(p0.x * cw + 0.1, p0.y * ch + 0.1);
        } else {
          for (var i = 1; i < stroke.points.length; i++) {
            var p = stroke.points[i];
            // Deterministic wobble using hash instead of Math.random()
            var wobbleX = pass > 0 ? (hash(strokeIdx * 1000 + i * 10 + pass, pass * 7 + i) - 0.5) * wetness * 2 : 0;
            var wobbleY = pass > 0 ? (hash(pass * 13 + i, strokeIdx * 1000 + i * 10 + pass * 3) - 0.5) * wetness * 2 : 0;
            ctx.lineTo(p.x * cw + wobbleX, p.y * ch + wobbleY);
          }
        }
        ctx.stroke();
      }

      // Edge pigment accumulation — darker edges on base stroke
      if (!stroke.eraser && stroke.points.length > 1) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = opacity * 0.15;
        ctx.strokeStyle = '#' + color;
        ctx.lineWidth = size * 0.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * cw, stroke.points[0].y * ch);
        for (var j = 1; j < stroke.points.length; j++) {
          var pt = stroke.points[j];
          ctx.lineTo(pt.x * cw, pt.y * ch);
        }
        ctx.stroke();
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
