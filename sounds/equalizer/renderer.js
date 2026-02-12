;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var EqualizerVisualizer = {
    id: 'equalizer',

    defaults: {
      color: '00ff41',
      bg: '0a0a0a',
      sensitivity: 5,
      bands: 16
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _peakData: null,
    _peakHold: null,
    _smoothing: 0.82,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._peakData = null;
      this._peakHold = null;

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
      this._smoothedData = null;
      this._peakData = null;
      this._peakHold = null;
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
      var bands = parseInt(cfg.bands, 10) || self.defaults.bands;
      if (bands < 8) bands = 8;
      if (bands > 32) bands = 32;

      var sensitivityScale = sensitivity / 5;

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Initialize arrays if needed
      if (!self._smoothedData || self._smoothedData.length !== bands) {
        self._smoothedData = new Float32Array(bands);
        self._peakData = new Float32Array(bands);
        self._peakHold = new Int32Array(bands);
      }

      // Layout
      var totalSegments = 24;
      var padding = w * 0.06;
      var meterArea = {
        left: padding,
        right: w - padding,
        top: h * 0.06,
        bottom: h * 0.9
      };
      var areaW = meterArea.right - meterArea.left;
      var areaH = meterArea.bottom - meterArea.top;

      var bandWidth = areaW / bands;
      var bandGap = Math.max(2, bandWidth * 0.2);
      var barW = bandWidth - bandGap;

      var segGap = Math.max(1, areaH * 0.01);
      var segHeight = (areaH - (totalSegments - 1) * segGap) / totalSegments;

      // Process frequency data into bands
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        var binsPerBand = Math.floor(binCount / bands);
        if (binsPerBand < 1) binsPerBand = 1;

        for (var b = 0; b < bands; b++) {
          var sum = 0;
          var start = b * binsPerBand;
          var end = Math.min(start + binsPerBand, binCount);
          for (var j = start; j < end; j++) {
            sum += freqData[j];
          }
          var avg = (sum / (end - start)) / 255;
          var target = avg * sensitivityScale;
          if (target > 1) target = 1;

          self._smoothedData[b] = self._smoothedData[b] * self._smoothing + target * (1 - self._smoothing);

          // Peak tracking
          if (self._smoothedData[b] > self._peakData[b]) {
            self._peakData[b] = self._smoothedData[b];
            self._peakHold[b] = 45; // hold frames
          } else {
            if (self._peakHold[b] > 0) {
              self._peakHold[b]--;
            } else {
              self._peakData[b] *= 0.96;
            }
          }
        }
      } else {
        // Decay toward zero when idle
        for (var b = 0; b < bands; b++) {
          self._smoothedData[b] *= 0.95;
          if (self._peakHold[b] > 0) {
            self._peakHold[b]--;
          } else {
            self._peakData[b] *= 0.96;
          }
        }
      }

      // Draw bands
      for (var b = 0; b < bands; b++) {
        var bx = meterArea.left + b * bandWidth + bandGap / 2;
        var level = self._smoothedData[b];
        var peakLevel = self._peakData[b];
        var litSegments = Math.floor(level * totalSegments);
        var peakSeg = Math.floor(peakLevel * totalSegments);

        for (var s = 0; s < totalSegments; s++) {
          var segIndex = totalSegments - 1 - s; // bottom = index 0
          var sy = meterArea.top + s * (segHeight + segGap);
          var fraction = segIndex / totalSegments;

          // Segment color based on position
          var segR, segG, segB;
          if (fraction >= 0.8) {
            segR = 255; segG = 30; segB = 30;
          } else if (fraction >= 0.6) {
            segR = 255; segG = 200; segB = 0;
          } else {
            segR = baseColor.r; segG = baseColor.g; segB = baseColor.b;
          }

          var isLit = segIndex < litSegments;
          var isPeakDot = (segIndex === peakSeg) && peakLevel > 0.02;

          if (isPeakDot) {
            // Peak dot: bright with glow
            ctx.fillStyle = 'rgb(' + Math.min(255, segR + 100) + ',' + Math.min(255, segG + 100) + ',' + Math.min(255, segB + 100) + ')';
            ctx.shadowColor = 'rgb(' + segR + ',' + segG + ',' + segB + ')';
            ctx.shadowBlur = 8;
          } else if (isLit) {
            ctx.fillStyle = 'rgb(' + segR + ',' + segG + ',' + segB + ')';
            ctx.shadowColor = 'rgb(' + segR + ',' + segG + ',' + segB + ')';
            ctx.shadowBlur = 3;
          } else {
            // Dim segment (idle row: bottom segment slightly brighter)
            var dimAlpha = (segIndex === 0) ? 0.12 : 0.05;
            ctx.fillStyle = 'rgba(' + segR + ',' + segG + ',' + segB + ',' + dimAlpha + ')';
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(bx, sy, barW, segHeight);
        }
        ctx.shadowBlur = 0;
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(EqualizerVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
