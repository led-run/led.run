/**
 * Draw Theme: Chalkboard
 * Dark green/black board texture with rough chalk strokes
 */
;(function() {
  'use strict';

  var theme = {
    id: 'chalk',
    defaults: { color: 'ffffff', bg: '2d5a27', size: 6, opacity: 1, smooth: 3, roughness: 5, dust: 3 },
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

      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';
      container.style.position = 'relative';

      // Background canvas for chalkboard texture
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
      this._renderBoard();
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
      this._renderBoard();
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

    _renderBoard: function() {
      var ctx = this._bgCanvas.getContext('2d');
      var w = this._bgCanvas.width;
      var h = this._bgCanvas.height;

      // Base color
      ctx.fillStyle = '#' + (this._config.bg || '2d5a27');
      ctx.fillRect(0, 0, w, h);

      // Subtle texture noise
      var imageData = ctx.getImageData(0, 0, w, h);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 15;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
      }
      ctx.putImageData(imageData, 0, 0);

      // Border / frame
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
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

      var roughness = parseFloat(this._config.roughness) || 5;
      var dust = parseFloat(this._config.dust) || 3;

      ctx.save();

      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * 0.85;
      }

      ctx.strokeStyle = '#' + (stroke.eraser ? '000' : stroke.color);
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Main stroke with slight opacity variation for chalk texture
      ctx.beginPath();
      var p0 = stroke.points[0];
      ctx.moveTo(p0.x * cw, p0.y * ch);
      for (var i = 1; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        ctx.lineTo(p.x * cw, p.y * ch);
      }
      ctx.stroke();

      // Chalk dust particles
      if (!stroke.eraser && dust > 0) {
        ctx.globalAlpha = 0.3;
        for (var j = 0; j < stroke.points.length; j += 3) {
          var pt = stroke.points[j];
          var numDust = Math.floor(dust * 0.5);
          for (var d = 0; d < numDust; d++) {
            var ox = (Math.random() - 0.5) * stroke.size * roughness * 0.3;
            var oy = (Math.random() - 0.5) * stroke.size * roughness * 0.3;
            ctx.fillStyle = '#' + stroke.color;
            ctx.fillRect(pt.x * cw + ox, pt.y * ch + oy, 1, 1);
          }
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
      this._bgCanvas = null;
      this._ctx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
