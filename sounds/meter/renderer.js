;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var MeterVisualizer = {
    id: 'meter',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      orientation: 'vertical',
      showPeak: true
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _leftLevel: 0,
    _rightLevel: 0,
    _leftPeak: 0,
    _rightPeak: 0,
    _leftPeakHold: 0,
    _rightPeakHold: 0,
    _peakDecay: 0,
    _smoothing: 0.85,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._leftLevel = 0;
      this._rightLevel = 0;
      this._leftPeak = 0;
      this._rightPeak = 0;
      this._leftPeakHold = 0;
      this._rightPeakHold = 0;

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

    _computeRms: function(data, start, end) {
      var sum = 0;
      for (var i = start; i < end; i++) {
        var normalized = (data[i] / 255);
        sum += normalized * normalized;
      }
      return Math.sqrt(sum / (end - start));
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
      var orientation = cfg.orientation || self.defaults.orientation;
      var showPeak = cfg.showPeak !== undefined ? (cfg.showPeak === true || cfg.showPeak === 'true') : self.defaults.showPeak;
      var sensitivityScale = sensitivity / 5;

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Compute left/right RMS levels from frequency data
      var targetLeft = 0;
      var targetRight = 0;

      if (freqData && freqData.length > 0) {
        var half = Math.floor(freqData.length / 2);
        targetLeft = self._computeRms(freqData, 0, half) * sensitivityScale;
        targetRight = self._computeRms(freqData, half, freqData.length) * sensitivityScale;
        if (targetLeft > 1) targetLeft = 1;
        if (targetRight > 1) targetRight = 1;
      }

      // Smooth levels
      self._leftLevel = self._leftLevel * self._smoothing + targetLeft * (1 - self._smoothing);
      self._rightLevel = self._rightLevel * self._smoothing + targetRight * (1 - self._smoothing);

      // Peak hold logic
      if (self._leftLevel > self._leftPeak) {
        self._leftPeak = self._leftLevel;
        self._leftPeakHold = 60; // hold for ~60 frames
      } else {
        if (self._leftPeakHold > 0) {
          self._leftPeakHold--;
        } else {
          self._leftPeak *= 0.97;
        }
      }
      if (self._rightLevel > self._rightPeak) {
        self._rightPeak = self._rightLevel;
        self._rightPeakHold = 60;
      } else {
        if (self._rightPeakHold > 0) {
          self._rightPeakHold--;
        } else {
          self._rightPeak *= 0.97;
        }
      }

      var isVertical = orientation === 'vertical';
      var levels = [self._leftLevel, self._rightLevel];
      var peaks = [self._leftPeak, self._rightPeak];
      var labels = ['L', 'R'];

      // Meter layout parameters
      var totalSegments = 30;
      var segGap = 2;

      if (isVertical) {
        // Vertical: two meters side by side
        var meterWidth = Math.min(w * 0.15, 80);
        var spacing = meterWidth * 0.4;
        var totalWidth = meterWidth * 2 + spacing;
        var startX = (w - totalWidth) / 2;
        var meterTop = h * 0.08;
        var meterBottom = h * 0.88;
        var meterHeight = meterBottom - meterTop;
        var segHeight = (meterHeight - (totalSegments - 1) * segGap) / totalSegments;

        for (var ch = 0; ch < 2; ch++) {
          var mx = startX + ch * (meterWidth + spacing);
          var level = levels[ch];
          var peak = peaks[ch];
          var litSegments = Math.floor(level * totalSegments);

          // Draw label
          ctx.fillStyle = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.6)';
          ctx.font = 'bold ' + Math.round(meterWidth * 0.3) + 'px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(labels[ch], mx + meterWidth / 2, meterBottom + h * 0.06);

          for (var s = 0; s < totalSegments; s++) {
            var segIndex = totalSegments - 1 - s; // bottom = 0, top = max
            var sy = meterTop + s * (segHeight + segGap);
            var fraction = segIndex / totalSegments;

            // Color: green < 0.6, yellow < 0.8, red >= 0.8
            var segColor;
            if (fraction >= 0.8) {
              segColor = { r: 255, g: 30, b: 30 };
            } else if (fraction >= 0.6) {
              segColor = { r: 255, g: 200, b: 0 };
            } else {
              segColor = { r: baseColor.r, g: baseColor.g, b: baseColor.b };
            }

            var isLit = segIndex < litSegments;
            var isPeak = showPeak && Math.abs(segIndex - Math.floor(peak * totalSegments)) <= 0 && peak > 0.01;

            if (isPeak) {
              ctx.fillStyle = 'rgb(' + Math.min(255, segColor.r + 80) + ',' + Math.min(255, segColor.g + 80) + ',' + Math.min(255, segColor.b + 80) + ')';
              ctx.shadowColor = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowBlur = 10;
            } else if (isLit) {
              ctx.fillStyle = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowColor = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowBlur = 4;
            } else {
              // Dim segment
              ctx.fillStyle = 'rgba(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ',0.08)';
              ctx.shadowBlur = 0;
            }

            ctx.fillRect(mx, sy, meterWidth, segHeight);
          }
          ctx.shadowBlur = 0;
        }
      } else {
        // Horizontal: two meters stacked
        var meterHeight = Math.min(h * 0.15, 60);
        var spacing = meterHeight * 0.5;
        var totalHeight = meterHeight * 2 + spacing;
        var startY = (h - totalHeight) / 2;
        var meterLeft = w * 0.1;
        var meterRight = w * 0.9;
        var meterW = meterRight - meterLeft;
        var segWidth = (meterW - (totalSegments - 1) * segGap) / totalSegments;

        for (var ch = 0; ch < 2; ch++) {
          var my = startY + ch * (meterHeight + spacing);
          var level = levels[ch];
          var peak = peaks[ch];
          var litSegments = Math.floor(level * totalSegments);

          // Draw label
          ctx.fillStyle = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.6)';
          ctx.font = 'bold ' + Math.round(meterHeight * 0.4) + 'px monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[ch], meterLeft - 12, my + meterHeight / 2);

          for (var s = 0; s < totalSegments; s++) {
            var sx = meterLeft + s * (segWidth + segGap);
            var fraction = s / totalSegments;

            var segColor;
            if (fraction >= 0.8) {
              segColor = { r: 255, g: 30, b: 30 };
            } else if (fraction >= 0.6) {
              segColor = { r: 255, g: 200, b: 0 };
            } else {
              segColor = { r: baseColor.r, g: baseColor.g, b: baseColor.b };
            }

            var isLit = s < litSegments;
            var isPeak = showPeak && Math.abs(s - Math.floor(peak * totalSegments)) <= 0 && peak > 0.01;

            if (isPeak) {
              ctx.fillStyle = 'rgb(' + Math.min(255, segColor.r + 80) + ',' + Math.min(255, segColor.g + 80) + ',' + Math.min(255, segColor.b + 80) + ')';
              ctx.shadowColor = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowBlur = 10;
            } else if (isLit) {
              ctx.fillStyle = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowColor = 'rgb(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ')';
              ctx.shadowBlur = 4;
            } else {
              ctx.fillStyle = 'rgba(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ',0.08)';
              ctx.shadowBlur = 0;
            }

            ctx.fillRect(sx, my, segWidth, meterHeight);
          }
          ctx.shadowBlur = 0;
        }
        ctx.textBaseline = 'alphabetic';
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(MeterVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
