/**
 * Draw Theme: Calligraphy
 * Rice paper background, brush strokes with width varying by speed
 */
;(function() {
  'use strict';

  var theme = {
    id: 'calligraphy',
    defaults: { color: '1a1a1a', bg: 'f5f0e0', size: 8, opacity: 0.9, smooth: 4, pressure: 5, ink: 5 },
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

      container.style.background = '#' + (config.bg || 'f5f0e0');
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
      if (stroke.points.length < 2) {
        if (stroke.points.length === 1) {
          var p = stroke.points[0];
          ctx.save();
          ctx.fillStyle = '#' + (stroke.eraser ? '000' : stroke.color);
          ctx.globalAlpha = stroke.eraser ? 1 : (stroke.opacity || 0.9);
          if (stroke.eraser) ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(p.x * cw, p.y * ch, stroke.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return;
      }

      var pressure = (parseFloat(this._config.pressure) || 5) / 5;
      var ink = (parseFloat(this._config.ink) || 5) / 5;

      ctx.save();
      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.fillStyle = '#' + (stroke.eraser ? '000' : stroke.color);
      ctx.lineCap = 'round';

      // Draw varying-width stroke using circles at each point
      for (var i = 0; i < stroke.points.length; i++) {
        var pt = stroke.points[i];
        var x = pt.x * cw;
        var y = pt.y * ch;

        // Calculate speed-based width
        var speed = 0;
        if (i > 0) {
          var prev = stroke.points[i - 1];
          var dx = (pt.x - prev.x) * cw;
          var dy = (pt.y - prev.y) * ch;
          speed = Math.sqrt(dx * dx + dy * dy);
        }

        // Slower = thicker (like pressing harder)
        var widthFactor = Math.max(0.3, 1 - speed * pressure * 0.05);
        var width = stroke.size * widthFactor;

        // Ink opacity variation
        var alphaFactor = Math.max(0.5, 1 - speed * 0.01 * ink);
        ctx.globalAlpha = (stroke.eraser ? 1 : (stroke.opacity || 0.9)) * alphaFactor;

        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Connect to previous point
        if (i > 0) {
          var prevPt = stroke.points[i - 1];
          ctx.beginPath();
          ctx.moveTo(prevPt.x * cw, prevPt.y * ch);
          ctx.lineTo(x, y);
          ctx.lineWidth = width;
          ctx.strokeStyle = '#' + (stroke.eraser ? '000' : stroke.color);
          ctx.stroke();
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
