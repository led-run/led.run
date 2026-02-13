;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;

    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = c; g = x; b = 0;
    } else if (h < 240) {
      r = x; g = 0; b = c;
    } else if (h < 300) {
      r = 0; g = x; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  var MusicalColorsVisualizer = {
    id: 'musical-colors',

    defaults: {
      color: 'ff0000',      // Starting red (will be rainbowized)
      bg: '000000',
      sensitivity: 5,
      colorShift: 3         // Hue rotation speed 1-10
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _logBins: null,
    _hueOffset: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;
      this._hueOffset = 0;

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
      this._smoothedData = null;
      this._logBins = null;
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

    _generateLogBins: function(barCount, binCount) {
      if (this._logBins && this._logBins.length === barCount) {
        return this._logBins;
      }

      this._logBins = [];
      var minFreq = 1;
      var maxFreq = binCount;
      var logMin = Math.log(minFreq);
      var logMax = Math.log(maxFreq);
      var logStep = (logMax - logMin) / barCount;

      for (var i = 0; i < barCount; i++) {
        var startLog = logMin + i * logStep;
        var endLog = logMin + (i + 1) * logStep;
        var start = Math.floor(Math.exp(startLog));
        var end = Math.ceil(Math.exp(endLog));
        if (start < 1) start = 1;
        if (end > binCount) end = binCount;
        if (end <= start) end = start + 1;
        this._logBins.push({ start: start, end: end });
      }

      return this._logBins;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var colorShift = parseFloat(cfg.colorShift) || self.defaults.colorShift;
      var barCount = 64;
      var ctx = self._ctx;

      // Hue rotation
      self._hueOffset += colorShift * 0.2;
      if (self._hueOffset > 360) self._hueOffset -= 360;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var barWidth = w / barCount;
      var gap = Math.max(1, barWidth * 0.15);
      var barW = barWidth - gap;
      var baselineY = h * 0.85;

      if (!freqData || freqData.length === 0) {
        // Idle state: colorful baseline
        for (var i = 0; i < barCount; i++) {
          var hue = (i / barCount * 360 + self._hueOffset) % 360;
          var rgb = hslToRgb(hue, 0.8, 0.5);
          ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.2)';
          var x = i * barWidth + gap / 2;
          ctx.fillRect(x, baselineY - 2, barW, 2);
        }
        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      var logBins = self._generateLogBins(barCount, freqData.length);

      if (!self._smoothedData || self._smoothedData.length !== barCount) {
        self._smoothedData = new Float32Array(barCount);
      }

      // Enable glow
      ctx.shadowBlur = 12;

      for (var i = 0; i < barCount; i++) {
        var bin = logBins[i];
        var sum = 0;
        var count = bin.end - bin.start;
        for (var j = bin.start; j < bin.end; j++) {
          sum += freqData[j];
        }
        var avg = sum / count;

        self._smoothedData[i] = self._smoothedData[i] * 0.85 + avg * 0.15;

        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var barH = normalized * baselineY * 0.95;
        if (barH < 1) barH = 1;

        var x = i * barWidth + gap / 2;
        var barTop = baselineY - barH;

        // Rainbow hue distribution
        var hue = (i / barCount * 360 + self._hueOffset) % 360;
        var rgb = hslToRgb(hue, 0.8, 0.5);
        var lightRgb = hslToRgb(hue, 0.7, 0.7);

        // Gradient fill
        var grad = ctx.createLinearGradient(0, baselineY, 0, barTop);
        grad.addColorStop(0, 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
        grad.addColorStop(1, 'rgb(' + lightRgb.r + ',' + lightRgb.g + ',' + lightRgb.b + ')');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';

        ctx.fillRect(x, barTop, barW, barH);

        // Rounded top
        if (barH > 3) {
          var arcRadius = barW / 2;
          ctx.beginPath();
          ctx.arc(x + barW / 2, barTop, arcRadius, Math.PI, 0);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;

      // Mirror reflection with rainbow fade
      ctx.globalAlpha = 0.2;
      for (var i = 0; i < barCount; i++) {
        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var barH = normalized * baselineY * 0.95;
        if (barH < 1) barH = 1;

        var mirrorH = Math.min(barH * 0.4, (h - baselineY) * 0.8);
        var x = i * barWidth + gap / 2;

        var hue = (i / barCount * 360 + self._hueOffset) % 360;
        var rgb = hslToRgb(hue, 0.8, 0.5);

        var mirrorGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + mirrorH);
        mirrorGrad.addColorStop(0, 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
        mirrorGrad.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = mirrorGrad;
        ctx.fillRect(x, baselineY, barW, mirrorH);
      }
      ctx.globalAlpha = 1;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(MusicalColorsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
