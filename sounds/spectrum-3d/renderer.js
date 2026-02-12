;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var Spectrum3DVisualizer = {
    id: 'spectrum-3d',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      depth: 8
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _history: null,
    _barCount: 64,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;

      var depthLayers = parseInt(config.depth, 10) || this.defaults.depth;
      if (depthLayers < 3) depthLayers = 3;
      if (depthLayers > 15) depthLayers = 15;

      // Initialize history with empty arrays
      this._history = [];
      for (var i = 0; i < depthLayers; i++) {
        this._history.push(new Float32Array(this._barCount));
      }

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._draw();
    },

    destroy: function() {
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
      }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._container = null;
      this._audioEngine = null;
      this._config = null;
      this._history = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _sampleFrequencyData: function(freqData) {
      var barCount = this._barCount;
      var result = new Float32Array(barCount);
      if (!freqData || freqData.length === 0) return result;

      var binCount = freqData.length;
      var binsPerBar = Math.floor(binCount / barCount);
      if (binsPerBar < 1) binsPerBar = 1;

      for (var i = 0; i < barCount; i++) {
        var sum = 0;
        var start = i * binsPerBar;
        var end = Math.min(start + binsPerBar, binCount);
        for (var j = start; j < end; j++) {
          sum += freqData[j];
        }
        result[i] = sum / (end - start) / 255;
      }
      return result;
    },

    _getRowPoints: function(data, barCount, sensitivityScale, rowLeft, barW, rowY, maxBarH) {
      var points = [];
      for (var i = 0; i < barCount; i++) {
        var val = data[i] * sensitivityScale;
        if (val > 1) val = 1;
        var barH = val * maxBarH;
        points.push({
          x: rowLeft + i * barW + barW / 2,
          y: rowY - barH
        });
      }
      return points;
    },

    _drawSmoothPath: function(ctx, points, rowLeft, rowWidth, rowY, close) {
      if (points.length === 0) return;

      ctx.beginPath();
      if (close) {
        ctx.moveTo(rowLeft, rowY);
        ctx.lineTo(points[0].x, points[0].y);
      } else {
        ctx.moveTo(points[0].x, points[0].y);
      }

      // Draw smooth curves through points using midpoint control
      for (var i = 1; i < points.length; i++) {
        var prev = points[i - 1];
        var curr = points[i];
        var cpX = (prev.x + curr.x) / 2;
        var cpY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
      }
      // Final segment to last point
      var last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);

      if (close) {
        ctx.lineTo(rowLeft + rowWidth, rowY);
        ctx.closePath();
      }
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var barColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var depthLayers = self._history.length;

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Push new data into history (shift old data back, new data at front)
      // history[0] = farthest back, history[length-1] = nearest front
      for (var i = 0; i < depthLayers - 1; i++) {
        self._history[i] = self._history[i + 1];
      }
      self._history[depthLayers - 1] = self._sampleFrequencyData(freqData);

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var barCount = self._barCount;
      var sensitivityScale = sensitivity / 5;

      // Perspective parameters
      var vanishY = h * 0.15;    // vanishing point Y (top area)
      var bottomY = h * 0.95;    // front row baseline
      var vanishXCenter = w / 2;
      var frontWidth = w * 0.95; // front row total width
      var backWidth = w * 0.3;   // back row total width

      // Draw grid lines on the ground for depth effect (behind everything)
      ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.08)';
      ctx.lineWidth = 0.5;
      for (var layer = 0; layer < depthLayers; layer++) {
        var t = depthLayers > 1 ? layer / (depthLayers - 1) : 0;
        var rowY = vanishY + t * (bottomY - vanishY);
        var rowWidth = backWidth + t * (frontWidth - backWidth);
        var rowLeft = vanishXCenter - rowWidth / 2;
        ctx.beginPath();
        ctx.moveTo(rowLeft, rowY);
        ctx.lineTo(rowLeft + rowWidth, rowY);
        ctx.stroke();
      }

      // Draw rows from back (index 0) to front (index depthLayers-1)
      for (var layer = 0; layer < depthLayers; layer++) {
        var data = self._history[layer];
        var t = depthLayers > 1 ? layer / (depthLayers - 1) : 0; // 0 = back, 1 = front

        // Perspective interpolation
        var rowY = vanishY + t * (bottomY - vanishY);
        var rowWidth = backWidth + t * (frontWidth - backWidth);
        var rowLeft = vanishXCenter - rowWidth / 2;
        var barW = rowWidth / barCount;
        var maxBarH = (bottomY - vanishY) * 0.35 * (0.3 + t * 0.7);

        // Opacity: back rows are more transparent
        var baseAlpha = 0.15 + t * 0.85;
        if (!isRunning) baseAlpha *= 0.25;

        // Color brightness ramp
        var brightFactor = 0.3 + t * 0.7;
        var cr = Math.round(barColor.r * brightFactor);
        var cg = Math.round(barColor.g * brightFactor);
        var cb = Math.round(barColor.b * brightFactor);

        // Compute points for this row
        var points = self._getRowPoints(data, barCount, sensitivityScale, rowLeft, barW, rowY, maxBarH);

        // Glow for front rows
        if (t > 0.5) {
          ctx.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (baseAlpha * 0.3).toFixed(3) + ')';
          ctx.shadowBlur = 4 + t * 6;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw filled area
        self._drawSmoothPath(ctx, points, rowLeft, rowWidth, rowY, true);
        var grad = ctx.createLinearGradient(0, rowY - maxBarH, 0, rowY);
        grad.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + baseAlpha.toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (baseAlpha * 0.3).toFixed(3) + ')');
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke the top edge
        ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + baseAlpha.toFixed(3) + ')';
        ctx.lineWidth = 0.5 + t * 1.5;
        self._drawSmoothPath(ctx, points, rowLeft, rowWidth, rowY, false);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(Spectrum3DVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
