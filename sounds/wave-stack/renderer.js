;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  // Convert RGB to HSL, returns [h(0-360), s(0-1), l(0-1)]
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      h *= 360;
    }
    return [h, s, l];
  }

  function hslToString(h, s, l, a) {
    return 'hsla(' + Math.round(h % 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%,' + a.toFixed(3) + ')';
  }

  var WaveStackVisualizer = {
    id: 'wave-stack',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      layers: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedBands: null,
    _smoothing: 0.8,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedBands = null;

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
      this._smoothedBands = null;
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

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var ctx = self._ctx;

      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var layers = parseInt(cfg.layers, 10) || self.defaults.layers;
      if (layers < 3) layers = 3;
      if (layers > 10) layers = 10;

      var sensitivityScale = sensitivity / 5;
      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Points per wave curve
      var pointsPerLayer = 64;

      // Initialize smoothed data: layers x pointsPerLayer
      if (!self._smoothedBands || self._smoothedBands.length !== layers) {
        self._smoothedBands = [];
        for (var i = 0; i < layers; i++) {
          self._smoothedBands.push(new Float32Array(pointsPerLayer));
        }
      }

      // Split frequency data into layer bands
      var binCount = freqData ? freqData.length : 0;
      var binsPerLayer = binCount > 0 ? Math.floor(binCount / layers) : 0;

      for (var layer = 0; layer < layers; layer++) {
        var bandData = self._smoothedBands[layer];
        var binsPerPoint = binsPerLayer > 0 ? Math.max(1, Math.floor(binsPerLayer / pointsPerLayer)) : 0;

        for (var p = 0; p < pointsPerLayer; p++) {
          var target = 0;

          if (freqData && binsPerPoint > 0) {
            var binStart = layer * binsPerLayer + p * binsPerPoint;
            var binEnd = Math.min(binStart + binsPerPoint, (layer + 1) * binsPerLayer);
            if (binEnd > binCount) binEnd = binCount;

            var sum = 0;
            var count = 0;
            for (var j = binStart; j < binEnd; j++) {
              sum += freqData[j];
              count++;
            }
            if (count > 0) {
              target = (sum / count / 255) * sensitivityScale;
              if (target > 1) target = 1;
            }
          }

          bandData[p] = bandData[p] * self._smoothing + target * (1 - self._smoothing);
        }
      }

      // Draw layers from bottom (low freq) to top (high freq)
      var padding = h * 0.08;
      var areaH = h - padding * 2;
      var layerSpacing = areaH / layers;
      var maxWaveHeight = layerSpacing * 0.7;

      for (var layer = 0; layer < layers; layer++) {
        var bandData = self._smoothedBands[layer];

        // Layer baseline Y: bottom layers = low freq, top layers = high freq
        var baseY = h - padding - layer * layerSpacing;

        // Color: shift hue by ~30 degrees per layer
        var hue = baseHsl[0] + layer * 30;
        var sat = baseHsl[1];
        var lit = baseHsl[2];

        // Fill color with transparency for overlap
        var fillAlpha = 0.25;
        var strokeAlpha = 0.7;
        var fillColor = hslToString(hue, sat, lit, fillAlpha);
        var strokeColor = hslToString(hue, sat, lit, strokeAlpha);

        // Build bezier curve points
        ctx.beginPath();
        ctx.moveTo(0, baseY);

        for (var p = 0; p < pointsPerLayer; p++) {
          var x = (p / (pointsPerLayer - 1)) * w;
          var amplitude = bandData[p] * maxWaveHeight;
          var y = baseY - amplitude;

          if (p === 0) {
            ctx.lineTo(x, y);
          } else {
            // Bezier control points for smooth curves
            var prevX = ((p - 1) / (pointsPerLayer - 1)) * w;
            var prevAmp = bandData[p - 1] * maxWaveHeight;
            var prevY = baseY - prevAmp;
            var cpx = (prevX + x) / 2;
            ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
          }
        }

        // Close path down to baseline for fill
        ctx.lineTo(w, baseY);
        ctx.lineTo(0, baseY);
        ctx.closePath();

        // Fill area
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Stroke the top curve only
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (var p = 0; p < pointsPerLayer; p++) {
          var x = (p / (pointsPerLayer - 1)) * w;
          var amplitude = bandData[p] * maxWaveHeight;
          var y = baseY - amplitude;

          if (p === 0) {
            ctx.lineTo(x, y);
          } else {
            var prevX = ((p - 1) / (pointsPerLayer - 1)) * w;
            var prevAmp = bandData[p - 1] * maxWaveHeight;
            var prevY = baseY - prevAmp;
            var cpx = (prevX + x) / 2;
            ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
          }
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = hslToString(hue, sat, Math.min(1, lit + 0.2), 0.5);
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Idle state: draw dim baseline markers
      if (!isRunning) {
        for (var layer = 0; layer < layers; layer++) {
          var baseY = h - padding - layer * layerSpacing;
          var hue = baseHsl[0] + layer * 30;
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          ctx.lineTo(w, baseY);
          ctx.strokeStyle = hslToString(hue, baseHsl[1], baseHsl[2], 0.12);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(WaveStackVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
