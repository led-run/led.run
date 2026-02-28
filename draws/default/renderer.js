/**
 * Draw Theme: Default (Clean Canvas)
 * White canvas with smooth black strokes
 */
;(function() {
  'use strict';

  var theme = {
    id: 'default',
    defaults: { color: '000000', bg: 'ffffff', size: 5, opacity: 1, smooth: 5 },
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

      container.style.background = '#' + (config.bg || 'ffffff');
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

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;
      }

      ctx.strokeStyle = '#' + (stroke.eraser ? '000000' : stroke.color);
      ctx.lineWidth = stroke.size;
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
          ctx.lineTo(p.x * cw, p.y * ch);
        }
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
      this._ctx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
