;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var ScopeVisualizer = {
    id: 'scope',

    defaults: {
      color: '00ff80',      // Classic oscilloscope green
      bg: '0a0a0a',
      sensitivity: 5,
      lineWidth: 2,
      gridLines: true
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;

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

    _drawGrid: function(ctx, w, h, color) {
      ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.15)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      var vSpacing = w / 10;
      for (var i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * vSpacing, 0);
        ctx.lineTo(i * vSpacing, h);
        ctx.stroke();
      }

      // Horizontal grid lines
      var hSpacing = h / 8;
      for (var i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * hSpacing);
        ctx.lineTo(w, i * hSpacing);
        ctx.stroke();
      }

      // Center lines (brighter)
      ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.3)';
      ctx.lineWidth = 1.5;

      // Horizontal center
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Vertical center for dual channel split
      ctx.beginPath();
      ctx.moveTo(0, h / 4);
      ctx.lineTo(w, h / 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 3 * h / 4);
      ctx.lineTo(w, 3 * h / 4);
      ctx.stroke();
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var lineColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var lineWidth = parseFloat(cfg.lineWidth) || self.defaults.lineWidth;
      var showGrid = cfg.gridLines !== undefined ? cfg.gridLines : self.defaults.gridLines;
      var ctx = self._ctx;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Draw grid if enabled
      if (showGrid) {
        self._drawGrid(ctx, w, h, lineColor);
      }

      var timeData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        timeData = self._audioEngine.getTimeDomainData();
      }

      if (!timeData || timeData.length === 0) {
        // Idle state: draw horizontal center lines
        ctx.strokeStyle = 'rgba(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ',0.3)';
        ctx.lineWidth = lineWidth;

        var time = Date.now() * 0.001;
        var flicker = 0.3 + Math.sin(time * 4) * 0.05;
        ctx.globalAlpha = flicker;

        // Top channel (L)
        ctx.beginPath();
        ctx.moveTo(0, h / 4);
        ctx.lineTo(w, h / 4);
        ctx.stroke();

        // Bottom channel (R)
        ctx.beginPath();
        ctx.moveTo(0, 3 * h / 4);
        ctx.lineTo(w, 3 * h / 4);
        ctx.stroke();

        ctx.globalAlpha = 1;

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // Simulate dual channel by splitting the waveform
      var bufferLength = timeData.length;
      var sliceWidth = w / bufferLength;
      var amp = (h / 4) * (sensitivity / 5);

      // Enable glow
      ctx.shadowColor = 'rgb(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ')';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgb(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ')';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw top channel (L) - upper half
      ctx.beginPath();
      var yTop = h / 4;
      for (var i = 0; i < bufferLength; i++) {
        var v = timeData[i] / 128.0 - 1; // Normalize to -1 to 1
        var y = yTop + v * amp * 0.8;
        var x = i * sliceWidth;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw bottom channel (R) - lower half (phase inverted for visual variety)
      ctx.beginPath();
      var yBottom = 3 * h / 4;
      for (var i = 0; i < bufferLength; i++) {
        var v = timeData[i] / 128.0 - 1;
        var y = yBottom - v * amp * 0.8; // Inverted phase
        var x = i * sliceWidth;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Optional: fill area under waveform with low opacity
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.15;

      // Fill top channel
      ctx.fillStyle = 'rgb(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ')';
      ctx.beginPath();
      ctx.moveTo(0, yTop);
      for (var i = 0; i < bufferLength; i++) {
        var v = timeData[i] / 128.0 - 1;
        var y = yTop + v * amp * 0.8;
        var x = i * sliceWidth;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, yTop);
      ctx.closePath();
      ctx.fill();

      // Fill bottom channel
      ctx.beginPath();
      ctx.moveTo(0, yBottom);
      for (var i = 0; i < bufferLength; i++) {
        var v = timeData[i] / 128.0 - 1;
        var y = yBottom - v * amp * 0.8;
        var x = i * sliceWidth;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, yBottom);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ScopeVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
