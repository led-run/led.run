;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var BarsVisualizer = {
    id: 'bars',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      smoothing: 0.8,
      barCount: 64
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;

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

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var barColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var smoothing = parseFloat(cfg.smoothing) || self.defaults.smoothing;
      var barCount = parseInt(cfg.barCount, 10) || self.defaults.barCount;

      // Clear with background
      self._ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      self._ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      if (!freqData || freqData.length === 0) {
        // Idle state: draw dim baseline bars
        self._ctx.fillStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.15)';
        var idleBarWidth = w / barCount;
        var gap = Math.max(1, idleBarWidth * 0.1);
        for (var i = 0; i < barCount; i++) {
          var x = i * idleBarWidth;
          var idleH = 2;
          self._ctx.fillRect(x + gap / 2, h - idleH, idleBarWidth - gap, idleH);
        }
        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // Sample frequency data into barCount bins
      var binCount = freqData.length;
      var binsPerBar = Math.floor(binCount / barCount);
      if (binsPerBar < 1) binsPerBar = 1;

      // Initialize smoothed data
      if (!self._smoothedData || self._smoothedData.length !== barCount) {
        self._smoothedData = new Float32Array(barCount);
      }

      var barWidth = w / barCount;
      var gap = Math.max(1, barWidth * 0.1);

      self._ctx.fillStyle = 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')';

      for (var i = 0; i < barCount; i++) {
        // Average the frequency bins for this bar
        var sum = 0;
        var start = i * binsPerBar;
        var end = Math.min(start + binsPerBar, binCount);
        for (var j = start; j < end; j++) {
          sum += freqData[j];
        }
        var avg = sum / (end - start);

        // Apply smoothing
        self._smoothedData[i] = self._smoothedData[i] * smoothing + avg * (1 - smoothing);

        // Normalize to 0-1 and apply sensitivity
        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var barH = normalized * h;
        if (barH < 1) barH = 1;

        var x = i * barWidth;
        self._ctx.fillRect(x + gap / 2, h - barH, barWidth - gap, barH);
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BarsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
