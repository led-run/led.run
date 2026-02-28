/**
 * Draw Theme: Pixel Art
 * Grid canvas with strokes snapping to pixel grid
 */
;(function() {
  'use strict';

  var theme = {
    id: 'pixel',
    defaults: { color: '000000', bg: 'ffffff', size: 1, opacity: 1, smooth: 0, gridSize: 16, gap: 1 },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _resizeHandler: null,
    _pixelMap: null,

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
        drawEngine.onStrokeUpdate = function(stroke) { self._renderAll(); if (stroke) self._drawStrokePixels(stroke); };
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
      var gridSize = parseFloat(this._config.gridSize) || 16;
      var gap = parseFloat(this._config.gap) || 1;

      ctx.clearRect(0, 0, cw, ch);

      // Draw grid
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 0.5;
      for (var x = 0; x < cw; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      for (var y = 0; y < ch; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      if (!this._engine) return;

      // Build pixel map from all strokes
      var cols = Math.ceil(cw / gridSize);
      var rows = Math.ceil(ch / gridSize);
      var pixelMap = {};

      var strokes = this._engine.getStrokes();
      for (var i = 0; i < strokes.length; i++) {
        this._addToPixelMap(pixelMap, strokes[i], cw, ch, gridSize, cols, rows);
      }

      // Render pixel map
      for (var key in pixelMap) {
        var px = pixelMap[key];
        ctx.fillStyle = '#' + px.color;
        ctx.globalAlpha = px.opacity;
        ctx.fillRect(px.col * gridSize + gap, px.row * gridSize + gap, gridSize - gap * 2, gridSize - gap * 2);
      }
      ctx.globalAlpha = 1;
    },

    _addToPixelMap: function(map, stroke, cw, ch, gridSize, cols, rows) {
      for (var i = 0; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        var col = Math.floor(p.x * cw / gridSize);
        var row = Math.floor(p.y * ch / gridSize);
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        var key = col + ',' + row;
        if (stroke.eraser) {
          delete map[key];
        } else {
          map[key] = { col: col, row: row, color: stroke.color, opacity: stroke.opacity || 1 };
        }
      }
    },

    _drawStrokePixels: function(stroke) {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      var gridSize = parseFloat(this._config.gridSize) || 16;
      var gap = parseFloat(this._config.gap) || 1;

      for (var i = 0; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        var col = Math.floor(p.x * cw / gridSize);
        var row = Math.floor(p.y * ch / gridSize);

        if (stroke.eraser) {
          ctx.clearRect(col * gridSize, row * gridSize, gridSize, gridSize);
        } else {
          ctx.fillStyle = '#' + stroke.color;
          ctx.globalAlpha = stroke.opacity || 1;
          ctx.fillRect(col * gridSize + gap, row * gridSize + gap, gridSize - gap * 2, gridSize - gap * 2);
          ctx.globalAlpha = 1;
        }
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
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
