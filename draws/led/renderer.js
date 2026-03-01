/**
 * Draw Theme: LED Matrix
 * LED dot matrix display with glowing dots on dark background
 * Unlit LED grid visible, strokes light up corresponding LEDs
 */
;(function() {
  'use strict';

  function hash(x, y) {
    var h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
    h = ((h >> 13) ^ h) * 1274126177;
    return ((h >> 16) ^ h) & 0x7fffffff;
  }

  var theme = {
    id: 'led',
    defaults: { color: 'ff0000', bg: '0a0a0a', size: 5, opacity: 1, smooth: 0, ledSize: 8, brightness: 8 },
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

      container.style.background = '#' + (config.bg || '0a0a0a');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';

      // Background canvas for unlit LED grid
      var bgCanvas = document.createElement('canvas');
      bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      container.appendChild(bgCanvas);
      this._bgCanvas = bgCanvas;
      this._bgCtx = bgCanvas.getContext('2d');

      // Main canvas for lit LEDs
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
        drawEngine.onStrokeUpdate = function() { self._renderAll(); };
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
      var spacing = (parseFloat(this._config.ledSize) || 8) * 2;
      var dotRadius = spacing * 0.3;

      ctx.clearRect(0, 0, cw, ch);

      // Fill background
      ctx.fillStyle = '#' + (this._config.bg || '0a0a0a');
      ctx.fillRect(0, 0, cw, ch);

      // Draw unlit LED dots
      var cols = Math.ceil(cw / spacing) + 1;
      var rows = Math.ceil(ch / spacing) + 1;

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cx = c * spacing + spacing / 2;
          var cy = r * spacing + spacing / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fill();
        }
      }
    },

    _renderAll: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      if (!this._engine) return;
      var strokes = this._engine.getStrokes();
      if (strokes.length === 0) return;

      var spacing = (parseFloat(this._config.ledSize) || 8) * 2;
      var dotRadius = spacing * 0.3;
      var color = this._config.color || 'ff0000';
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;
      var glowMul = parseFloat(this._config.brightness) || 8;
      var brushSize = parseFloat(this._config.size) || 5;

      // Parse color
      var cr = parseInt(color.substring(0, 2), 16);
      var cg = parseInt(color.substring(2, 4), 16);
      var cb = parseInt(color.substring(4, 6), 16);

      // Build LED map from strokes
      var litMap = {};
      var cols = Math.ceil(cw / spacing) + 1;
      var rows = Math.ceil(ch / spacing) + 1;
      var brushRadius = brushSize * spacing * 0.15;

      for (var si = 0; si < strokes.length; si++) {
        var stroke = strokes[si];
        for (var pi = 0; pi < stroke.points.length; pi++) {
          var p = stroke.points[pi];
          var px = p.x * cw;
          var py = p.y * ch;

          // Light up LEDs within brush radius
          var minC = Math.max(0, Math.floor((px - brushRadius) / spacing));
          var maxC = Math.min(cols - 1, Math.ceil((px + brushRadius) / spacing));
          var minR = Math.max(0, Math.floor((py - brushRadius) / spacing));
          var maxR = Math.min(rows - 1, Math.ceil((py + brushRadius) / spacing));

          for (var lr = minR; lr <= maxR; lr++) {
            for (var lc = minC; lc <= maxC; lc++) {
              var ledX = lc * spacing + spacing / 2;
              var ledY = lr * spacing + spacing / 2;
              var dx = px - ledX;
              var dy = py - ledY;
              if (dx * dx + dy * dy <= brushRadius * brushRadius) {
                var key = lc + ',' + lr;
                if (stroke.eraser) {
                  delete litMap[key];
                } else {
                  litMap[key] = { c: lc, r: lr };
                }
              }
            }
          }
        }
      }

      // Render lit LEDs
      ctx.save();
      for (var key in litMap) {
        var led = litMap[key];
        var lx = led.c * spacing + spacing / 2;
        var ly = led.r * spacing + spacing / 2;

        // Deterministic brightness variation (95%-100%)
        var h = hash(led.c, led.r);
        var bri = 0.95 + 0.05 * ((h % 100) / 100);

        // Glow
        ctx.shadowBlur = glowMul * 1.5;
        ctx.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (opacity * bri * 0.6) + ')';

        // LED dot
        ctx.beginPath();
        ctx.arc(lx, ly, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (opacity * bri) + ')';
        ctx.fill();
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
      this._bgCanvas = null;
      this._bgCtx = null;
      this._container = null;
      this._engine = null;
    }
  };

  DrawManager.register(theme);
})();
