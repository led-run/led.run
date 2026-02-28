/**
 * Draw Theme: Spray Paint
 * Concrete/brick texture background with random dot spray effect
 */
;(function() {
  'use strict';

  var theme = {
    id: 'spray',
    defaults: { color: 'ff0000', bg: '808080', size: 20, opacity: 1, smooth: 2, density: 5, scatter: 5 },
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

      container.style.background = '#' + (config.bg || '808080');
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
      this._renderWall();
      this._renderAll();

      var self = this;
      this._resizeHandler = function() { self._onResize(); };
      window.addEventListener('resize', this._resizeHandler);

      if (drawEngine) {
        drawEngine.onStroke = function() { self._renderWall(); self._renderAll(); };
        drawEngine.onStrokeUpdate = function(stroke) { self._renderWall(); self._renderAll(); if (stroke) self._drawStroke(self._ctx, stroke, self._canvas.width, self._canvas.height); };
      }
    },

    _onResize: function() {
      this._resize();
      this._renderWall();
      this._renderAll();
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
    },

    _renderWall: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;

      // Concrete texture
      ctx.fillStyle = '#' + (this._config.bg || '808080');
      ctx.fillRect(0, 0, cw, ch);

      var imageData = ctx.getImageData(0, 0, cw, ch);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 20;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
      }
      ctx.putImageData(imageData, 0, 0);
    },

    _renderAll: function() {
      if (!this._engine) return;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      var strokes = this._engine.getStrokes();
      for (var i = 0; i < strokes.length; i++) {
        this._drawStroke(this._ctx, strokes[i], cw, ch);
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch) {
      if (stroke.points.length < 1) return;

      var density = parseFloat(this._config.density) || 5;
      var scatter = parseFloat(this._config.scatter) || 5;
      var radius = stroke.size * scatter / 5;
      var dotCount = Math.floor(density * 3);

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.fillStyle = '#' + (stroke.eraser ? '000' : stroke.color);

      for (var i = 0; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        var cx = p.x * cw;
        var cy = p.y * ch;

        for (var d = 0; d < dotCount; d++) {
          var angle = Math.random() * Math.PI * 2;
          var dist = Math.random() * radius;
          var dx = cx + Math.cos(angle) * dist;
          var dy = cy + Math.sin(angle) * dist;
          var dotSize = Math.random() * 2 + 0.5;
          ctx.globalAlpha = (stroke.opacity || 1) * (1 - dist / radius) * 0.8;
          ctx.beginPath();
          ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
          ctx.fill();
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
      this._ctx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
