/**
 * Draw Theme: Neon Glow
 * Dark background with bright neon strokes + always-on ambient flicker
 * Three-pass glow rendering with Bézier smooth curves
 */
;(function() {
  'use strict';

  var theme = {
    id: 'neon',
    defaults: { color: '00ff41', bg: '0a0a0a', size: 4, opacity: 1, smooth: 5, glow: 8, pulse: true },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _resizeHandler: null,
    _phase: 0,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;
      this._phase = 0;

      container.style.background = '#' + (config.bg || '0a0a0a');
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

      // Always start ambient animation — neon tubes are always on
      this._startAmbient();
    },

    _startAmbient: function() {
      var self = this;
      function loop() {
        self._raf = requestAnimationFrame(loop);
        self._phase += 0.03;
        self._renderAll();
      }
      this._raf = requestAnimationFrame(loop);
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

    _buildPath: function(ctx, points, cw, ch) {
      ctx.beginPath();
      ctx.moveTo(points[0].x * cw, points[0].y * ch);

      if (points.length === 1) {
        ctx.lineTo(points[0].x * cw + 0.1, points[0].y * ch + 0.1);
      } else if (points.length === 2) {
        ctx.lineTo(points[1].x * cw, points[1].y * ch);
      } else {
        // Bézier smooth
        for (var i = 1; i < points.length - 1; i++) {
          var mx = (points[i].x + points[i + 1].x) / 2 * cw;
          var my = (points[i].y + points[i + 1].y) / 2 * ch;
          ctx.quadraticCurveTo(points[i].x * cw, points[i].y * ch, mx, my);
        }
        var last = points[points.length - 1];
        ctx.lineTo(last.x * cw, last.y * ch);
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch) {
      if (stroke.points.length < 1) return;

      var color = this._config.color || '00ff41';
      var size = parseFloat(this._config.size) || 4;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;
      var glowSize = parseFloat(this._config.glow) || 8;
      var phase = this._phase;

      // Always-on micro flicker — simulates current fluctuation
      var flicker = 0.95 + 0.05 * Math.sin(phase * 2.3);

      // Pulse breathing overlay (when pulse=true)
      var usePulse = this._config.pulse === true || this._config.pulse === 'true';
      if (usePulse) {
        flicker *= 0.7 + 0.3 * Math.sin(phase);
      }

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = size;
        this._buildPath(ctx, stroke.points, cw, ch);
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.globalCompositeOperation = 'source-over';

      // Pass 1: Wide outer glow (very faint, large spread)
      ctx.globalAlpha = opacity * 0.12 * flicker;
      ctx.shadowBlur = glowSize * 6;
      ctx.shadowColor = '#' + color;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size * 2.5;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      // Pass 2: Main glow
      ctx.globalAlpha = opacity * flicker;
      ctx.shadowBlur = glowSize * 3;
      ctx.shadowColor = '#' + color;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      // Pass 3: Bright inner core
      ctx.globalAlpha = opacity * 0.5 * flicker;
      ctx.shadowBlur = glowSize;
      ctx.lineWidth = size * 0.5;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      ctx.restore();
    },

    destroy: function() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
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
