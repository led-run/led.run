/**
 * Draw Theme: Light Painting (Glow Stick)
 * Pure black background, thick glowing trails with afterglow fade
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
    _resizeHandler: null,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;

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
      for (var i = 0; i < strokes.length; i++) {
        this._drawStroke(strokes[i], cw, ch);
      }
    },

    _renderLive: function(stroke) {
      this._renderAll();
      if (stroke) {
        this._drawStroke(stroke, this._canvas.width, this._canvas.height);
      }
    },

    _drawStroke: function(stroke, cw, ch) {
      if (stroke.points.length < 1) return;
      var trail = parseFloat(this._config.trail) || 5;

      // Glow layer — wide, blurred
      var gctx = this._glowCtx;
      gctx.save();
      if (stroke.eraser) {
        gctx.globalCompositeOperation = 'destination-out';
        gctx.globalAlpha = 1;
        gctx.shadowBlur = 0;
      } else {
        gctx.globalCompositeOperation = 'lighter';
        gctx.globalAlpha = 0.4 * (stroke.opacity || 1);
        gctx.shadowBlur = trail * 8;
        gctx.shadowColor = '#' + stroke.color;
      }
      gctx.strokeStyle = '#' + (stroke.eraser ? '000' : stroke.color);
      gctx.lineWidth = stroke.size * 2;
      gctx.lineCap = 'round';
      gctx.lineJoin = 'round';
      gctx.beginPath();
      var p0 = stroke.points[0];
      gctx.moveTo(p0.x * cw, p0.y * ch);
      for (var i = 1; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        gctx.lineTo(p.x * cw, p.y * ch);
      }
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
        ctx.globalAlpha = stroke.opacity || 1;
        ctx.shadowBlur = trail * 3;
        ctx.shadowColor = '#' + stroke.color;
      }
      ctx.strokeStyle = '#' + (stroke.eraser ? '000' : stroke.color);
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p0.x * cw, p0.y * ch);
      for (var j = 1; j < stroke.points.length; j++) {
        var pt = stroke.points[j];
        ctx.lineTo(pt.x * cw, pt.y * ch);
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
      this._glowCanvas = null;
      this._ctx = null;
      this._glowCtx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
