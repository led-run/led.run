/**
 * Draw Theme: Light Painting (Glow Stick)
 * Pure black background, glowing light-painting trails with ambient breathing
 * rAF animation for glow pulsing, fade parameter controls breath amplitude
 */
;(function() {
  'use strict';

  var theme = {
    id: 'glow-stick',
    defaults: { color: 'ff00ff', bg: '000000', size: 8, opacity: 1, smooth: 6, trail: 5, fade: 3 },
    _canvas: null,
    _glowCanvas: null,
    _ctx: null,
    _glowCtx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _phase: 0,
    _resizeHandler: null,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;
      this._phase = 0;

      container.style.background = '#' + (config.bg || '000000');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Glow layer
      var glowCanvas = document.createElement('canvas');
      glowCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      container.appendChild(glowCanvas);
      this._glowCanvas = glowCanvas;
      this._glowCtx = glowCanvas.getContext('2d');

      // Main drawing layer
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
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

      // Start ambient glow animation
      this._startAmbient();
    },

    _startAmbient: function() {
      var self = this;
      function loop() {
        self._raf = requestAnimationFrame(loop);
        self._phase += 0.02;
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
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      this._canvas.width = w;
      this._canvas.height = h;
      this._glowCanvas.width = w;
      this._glowCanvas.height = h;
    },

    _renderAll: function() {
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      this._ctx.clearRect(0, 0, cw, ch);
      this._glowCtx.clearRect(0, 0, cw, ch);

      if (!this._engine) return;
      var strokes = this._engine.getStrokes();
      var total = strokes.length;
      for (var i = 0; i < total; i++) {
        this._drawStroke(strokes[i], cw, ch, i, total);
      }
    },

    _renderLive: function(stroke) {
      this._renderAll();
      if (stroke) {
        var total = this._engine ? this._engine.getStrokes().length + 1 : 1;
        this._drawStroke(stroke, this._canvas.width, this._canvas.height, total - 1, total);
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
        for (var i = 1; i < points.length - 1; i++) {
          var mx = (points[i].x + points[i + 1].x) / 2 * cw;
          var my = (points[i].y + points[i + 1].y) / 2 * ch;
          ctx.quadraticCurveTo(points[i].x * cw, points[i].y * ch, mx, my);
        }
        var last = points[points.length - 1];
        ctx.lineTo(last.x * cw, last.y * ch);
      }
    },

    _drawStroke: function(stroke, cw, ch, strokeIndex, totalStrokes) {
      if (stroke.points.length < 1) return;
      var trail = parseFloat(this._config.trail) || 5;
      var fade = parseFloat(this._config.fade) || 3;
      var color = this._config.color || 'ff00ff';
      var size = parseFloat(this._config.size) || 8;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;
      var phase = this._phase;

      // Afterglow decay — earlier strokes are dimmer (simulating fluorescent decay)
      var ageFactor = 1;
      if (totalStrokes > 1) {
        ageFactor = 0.4 + 0.6 * (strokeIndex / (totalStrokes - 1));
      }

      // Breathing glow modulation — fade controls amplitude
      var breathAmp = fade / 10;
      var glowBreath = 0.9 + 0.1 * Math.sin(phase * 2.3);
      var alphaBreath = 0.85 + breathAmp * Math.sin(phase * (fade / 3));

      // Glow layer — wide, blurred
      var gctx = this._glowCtx;
      gctx.save();
      if (stroke.eraser) {
        gctx.globalCompositeOperation = 'destination-out';
        gctx.globalAlpha = 1;
        gctx.shadowBlur = 0;
      } else {
        gctx.globalCompositeOperation = 'lighter';
        gctx.globalAlpha = (0.35 + 0.1 * Math.sin(phase * 1.2)) * opacity * ageFactor * alphaBreath;
        gctx.shadowBlur = trail * 8 * glowBreath;
        gctx.shadowColor = '#' + color;
      }
      gctx.strokeStyle = '#' + (stroke.eraser ? '000' : color);
      gctx.lineWidth = size * 2;
      gctx.lineCap = 'round';
      gctx.lineJoin = 'round';
      this._buildPath(gctx, stroke.points, cw, ch);
      gctx.stroke();
      gctx.restore();

      // Core layer — sharp, bright
      var ctx = this._ctx;
      ctx.save();
      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity * ageFactor * alphaBreath;
        ctx.shadowBlur = trail * 3 * glowBreath;
        ctx.shadowColor = '#' + color;
      }
      ctx.strokeStyle = '#' + (stroke.eraser ? '000' : color);
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
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
      this._glowCanvas = null;
      this._ctx = null;
      this._glowCtx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
