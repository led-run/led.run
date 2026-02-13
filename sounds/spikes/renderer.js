;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var SpikesVisualizer = {
    id: 'spikes',

    defaults: {
      color: '4080ff',      // Blue
      bg: '000000',
      sensitivity: 5,
      spikeCount: 64        // 32-128
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _logBins: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;

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

    _generateLogBins: function(spikeCount, binCount) {
      if (this._logBins && this._logBins.length === spikeCount) {
        return this._logBins;
      }

      this._logBins = [];
      var minFreq = 1;
      var maxFreq = binCount;
      var logMin = Math.log(minFreq);
      var logMax = Math.log(maxFreq);
      var logStep = (logMax - logMin) / spikeCount;

      for (var i = 0; i < spikeCount; i++) {
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
      var spikeColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var spikeCount = parseInt(cfg.spikeCount, 10) || self.defaults.spikeCount;
      if (spikeCount < 32) spikeCount = 32;
      if (spikeCount > 128) spikeCount = 128;
      var ctx = self._ctx;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var centerX = w / 2;
      var centerY = h / 2;
      var maxLength = Math.min(w, h) * 0.45;
      var minRadius = 30;

      if (!freqData || freqData.length === 0) {
        // Idle state: draw faint circle
        ctx.strokeStyle = 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        ctx.stroke();

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      var logBins = self._generateLogBins(spikeCount, freqData.length);

      if (!self._smoothedData || self._smoothedData.length !== spikeCount) {
        self._smoothedData = new Float32Array(spikeCount);
      }

      var angleStep = (Math.PI * 2) / spikeCount;

      // Create gradient colors
      var darkR = Math.floor(spikeColor.r * 0.3);
      var darkG = Math.floor(spikeColor.g * 0.3);
      var darkB = Math.floor(spikeColor.b * 0.3);

      ctx.shadowColor = 'rgb(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ')';
      ctx.shadowBlur = 10;

      for (var i = 0; i < spikeCount; i++) {
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

        var spikeLength = normalized * maxLength;
        if (spikeLength < 5) spikeLength = 5;

        var angle = i * angleStep;
        var x1 = centerX + Math.cos(angle) * minRadius;
        var y1 = centerY + Math.sin(angle) * minRadius;
        var x2 = centerX + Math.cos(angle) * (minRadius + spikeLength);
        var y2 = centerY + Math.sin(angle) * (minRadius + spikeLength);

        // Gradient from center (dark) to tip (bright)
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgb(' + darkR + ',' + darkG + ',' + darkB + ')');
        grad.addColorStop(0.5, 'rgb(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ')');
        grad.addColorStop(1, 'rgba(255, 255, 255, ' + (0.3 + normalized * 0.4) + ')');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2 + normalized * 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw center orb
      var orbRadius = minRadius * 0.8;
      var orbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      orbGrad.addColorStop(0, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0.5)');
      orbGrad.addColorStop(1, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0.1)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(SpikesVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
