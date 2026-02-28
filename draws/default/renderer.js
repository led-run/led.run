/**
 * Draw Theme: Default (Whiteboard Display)
 * Dot-grid background simulating a smart whiteboard, Bézier smooth strokes with soft shadow
 */
;(function() {
  'use strict';

  var theme = {
    id: 'default',
    defaults: { color: '000000', bg: 'ffffff', size: 5, opacity: 1, smooth: 5 },
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

      container.style.background = '#' + (config.bg || 'ffffff');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for dot grid (cached)
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
      this._renderGrid();
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
      this._renderGrid();
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

    _renderGrid: function() {
      var ctx = this._bgCanvas.getContext('2d');
      var w = this._bgCanvas.width;
      var h = this._bgCanvas.height;
      var spacing = 24;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';

      for (var x = spacing; x < w; x += spacing) {
        for (var y = spacing; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
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
      if (stroke.points.length < 1) return;
      ctx.save();

      var color = this._config.color || '000000';
      var size = parseFloat(this._config.size) || 5;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      }

      ctx.strokeStyle = '#' + (stroke.eraser ? '000000' : color);
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      var points = stroke.points;
      ctx.beginPath();
      ctx.moveTo(points[0].x * cw, points[0].y * ch);

      if (points.length === 1) {
        ctx.lineTo(points[0].x * cw + 0.1, points[0].y * ch + 0.1);
      } else if (points.length === 2) {
        ctx.lineTo(points[1].x * cw, points[1].y * ch);
      } else {
        // Bézier smooth — quadratic curves through midpoints
        for (var i = 1; i < points.length - 1; i++) {
          var mx = (points[i].x + points[i + 1].x) / 2 * cw;
          var my = (points[i].y + points[i + 1].y) / 2 * ch;
          ctx.quadraticCurveTo(points[i].x * cw, points[i].y * ch, mx, my);
        }
        // Last segment
        var last = points[points.length - 1];
        ctx.lineTo(last.x * cw, last.y * ch);
      }

      ctx.stroke();
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
