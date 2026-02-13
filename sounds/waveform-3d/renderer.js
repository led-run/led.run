;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var Waveform3DVisualizer = {
    id: 'waveform-3d',

    defaults: {
      color: '00ff80',      // Green
      bg: '000000',
      sensitivity: 5,
      depth: 8              // History depth 4-12
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _history: null,
    _maxHistory: 8,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._history = [];

      var cfg = this._config;
      var depth = parseInt(cfg.depth, 10) || this.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > 12) depth = 12;
      this._maxHistory = depth;

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
      this._history = null;
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
      var waveColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var depth = parseInt(cfg.depth, 10) || self.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > 12) depth = 12;
      if (self._maxHistory !== depth) {
        self._maxHistory = depth;
        self._history = [];
      }
      var ctx = self._ctx;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var timeData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        timeData = self._audioEngine.getTimeDomainData();
      }

      if (!timeData || timeData.length === 0) {
        // Idle state: draw horizontal line
        ctx.strokeStyle = 'rgba(' + waveColor.r + ',' + waveColor.g + ',' + waveColor.b + ',0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // Add current waveform to history
      var waveformCopy = new Uint8Array(timeData);
      self._history.push(waveformCopy);
      if (self._history.length > self._maxHistory) {
        self._history.shift();
      }

      // 3D perspective projection
      var vanishY = h * 0.2; // Vanishing point at top
      var frontY = h * 0.8;  // Front line at bottom

      // Draw from back to front
      for (var layer = 0; layer < self._history.length; layer++) {
        var waveform = self._history[layer];
        var progress = layer / (self._maxHistory - 1); // 0 (back) to 1 (front)
        if (self._history.length === 1) progress = 1;

        // Interpolate Y position for perspective
        var baseY = vanishY + (frontY - vanishY) * progress;

        // Scale and opacity based on depth
        var scale = 0.3 + progress * 0.7;
        var opacity = 0.3 + progress * 0.7;
        var lineWidth = 1 + progress * 2;

        // Amplitude scaling
        var amp = (h * 0.15) * scale * (sensitivity / 5);

        // Color gets brighter towards front
        var r = Math.floor(waveColor.r * (0.4 + progress * 0.6));
        var g = Math.floor(waveColor.g * (0.4 + progress * 0.6));
        var b = Math.floor(waveColor.b * (0.4 + progress * 0.6));

        // Enable glow for front layers
        if (progress > 0.5) {
          ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
          ctx.shadowBlur = 10 * progress;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw waveform
        ctx.beginPath();
        var bufferLength = waveform.length;
        var sliceWidth = w / bufferLength;

        for (var i = 0; i < bufferLength; i++) {
          var v = waveform[i] / 128.0 - 1; // Normalize to -1 to 1
          var y = baseY + v * amp;
          var x = i * sliceWidth;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Optional: fill area under waveform for front layer
        if (progress === 1 && self._history.length > 1) {
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          for (var i = 0; i < bufferLength; i++) {
            var v = waveform[i] / 128.0 - 1;
            var y = baseY + v * amp;
            var x = i * sliceWidth;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, baseY);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(Waveform3DVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
