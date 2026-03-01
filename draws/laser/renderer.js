/**
 * Draw Theme: Laser Engraving
 * Laser engraving on brushed metal surface
 * Bright laser lines with heat glow, burn marks, and metal texture
 */
;(function() {
  'use strict';

  var theme = {
    id: 'laser',
    defaults: { color: 'ff4500', bg: '1a1a2e', size: 3, opacity: 1, smooth: 5, power: 5, engrave: 5 },
    _canvas: null,
    _ctx: null,
    _bgCanvas: null,
    _bgCtx: null,
    _container: null,
    _config: null,
    _engine: null,
    _resizeHandler: null,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;

      container.style.background = '#' + (config.bg || '1a1a2e');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';

      // Background canvas for metal texture
      var bgCanvas = document.createElement('canvas');
      bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      container.appendChild(bgCanvas);
      this._bgCanvas = bgCanvas;
      this._bgCtx = bgCanvas.getContext('2d');

      // Main canvas for laser strokes
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      this._resize();
      this._renderBg();
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
      this._renderBg();
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

    _renderBg: function() {
      var ctx = this._bgCtx;
      var cw = this._bgCanvas.width;
      var ch = this._bgCanvas.height;

      // Base metal color
      var bg = this._config.bg || '1a1a2e';
      var br = parseInt(bg.substring(0, 2), 16);
      var bg2 = parseInt(bg.substring(2, 4), 16);
      var bb = parseInt(bg.substring(4, 6), 16);

      ctx.fillStyle = '#' + bg;
      ctx.fillRect(0, 0, cw, ch);

      // Horizontal brushed metal lines
      ctx.save();
      for (var y = 0; y < ch; y += 2) {
        var alpha = 0.02 + 0.02 * Math.sin(y * 0.7);
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(cw, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // Subtle gradient overlay for depth
      var grad = ctx.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    },

    _brighten: function(hex, amount) {
      var r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
      var g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
      var b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
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

    _drawStroke: function(ctx, stroke, cw, ch) {
      if (stroke.points.length < 1) return;

      var color = this._config.color || 'ff4500';
      var size = parseFloat(this._config.size) || 3;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;
      var power = parseFloat(this._config.power) || 5;
      var engrave = parseFloat(this._config.engrave) || 5;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = size * 3;
        this._buildPath(ctx, stroke.points, cw, ch);
        ctx.stroke();
        ctx.restore();
        return;
      }

      // Layer 1: Burn/engrave mark (darken background along path)
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.1 + engrave * 0.04;
      ctx.strokeStyle = 'rgba(20, 10, 5, 1)';
      ctx.lineWidth = size * 4;
      ctx.shadowBlur = 0;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';

      // Layer 2: Outer heat glow (wide, faint)
      ctx.globalAlpha = opacity * 0.08;
      ctx.shadowBlur = power * 5;
      ctx.shadowColor = '#' + color;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size * 4;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      // Layer 3: Mid glow
      ctx.globalAlpha = opacity * 0.4;
      ctx.shadowBlur = power * 3;
      ctx.shadowColor = '#' + color;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size * 1.5;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      // Layer 4: Bright inner core (white-hot center)
      ctx.globalAlpha = opacity * 0.9;
      ctx.shadowBlur = power * 1.5;
      ctx.shadowColor = '#' + color;
      ctx.strokeStyle = this._brighten(color, 180);
      ctx.lineWidth = size * 0.4;
      this._buildPath(ctx, stroke.points, cw, ch);
      ctx.stroke();

      ctx.restore();
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
      this._bgCanvas = null;
      this._bgCtx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
