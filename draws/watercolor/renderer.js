/**
 * Draw Theme: Watercolor
 * Paper texture background with diffused, semi-transparent watercolor strokes
 */
;(function() {
  'use strict';

  var theme = {
    id: 'watercolor',
    defaults: { color: '2266aa', bg: 'f5f0e8', size: 12, opacity: 0.4, smooth: 7, spread: 5, wetness: 5 },
    _canvas: null,
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

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      this._resize();
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
      this._renderAll();
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
    },

    _renderAll: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      // Paper texture
      this._renderPaper(ctx, cw, ch);

      if (!this._engine) return;
      var strokes = this._engine.getStrokes();
      for (var i = 0; i < strokes.length; i++) {
        this._drawStroke(ctx, strokes[i], cw, ch);
      }
    },

    _renderPaper: function(ctx, cw, ch) {
      // Subtle paper grain
      var imageData = ctx.createImageData(cw, ch);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 8;
        data[i] = 245 + noise;
        data[i + 1] = 240 + noise;
        data[i + 2] = 232 + noise;
        data[i + 3] = 30;
      }
      ctx.putImageData(imageData, 0, 0);
    },

    _renderLive: function(stroke) {
      this._renderAll();
      if (stroke) {
        this._drawStroke(this._ctx, stroke, this._canvas.width, this._canvas.height);
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch) {
      if (stroke.points.length < 1) return;
      var spread = (parseFloat(this._config.spread) || 5) / 5;
      var wetness = (parseFloat(this._config.wetness) || 5) / 5;

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 0.4) * 0.8;
      }

      // Multiple passes for watercolor diffusion effect
      var passes = stroke.eraser ? 1 : 3;
      for (var pass = 0; pass < passes; pass++) {
        var lineWidth = stroke.size * (1 + pass * spread * 0.4);
        var alpha = pass === 0 ? 1 : 0.3 / pass;
        ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 0.4) * alpha;

        ctx.strokeStyle = '#' + (stroke.eraser ? '000' : stroke.color);
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
            // Slight random wobble for watercolor effect
            var wobbleX = pass > 0 ? (Math.random() - 0.5) * wetness * 2 : 0;
            var wobbleY = pass > 0 ? (Math.random() - 0.5) * wetness * 2 : 0;
            ctx.lineTo(p.x * cw + wobbleX, p.y * ch + wobbleY);
          }
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
      this._ctx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
