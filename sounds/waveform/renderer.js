;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var WaveformVisualizer = {
    id: 'waveform',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      lineWidth: 2
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

      // Clear with background
      self._ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      self._ctx.fillRect(0, 0, w, h);

      var timeDomainData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        timeDomainData = self._audioEngine.getTimeDomainData();
      }

      var centerY = h / 2;

      self._ctx.strokeStyle = 'rgb(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ')';
      self._ctx.lineWidth = lineWidth;
      self._ctx.lineJoin = 'round';
      self._ctx.lineCap = 'round';

      if (!timeDomainData || timeDomainData.length === 0) {
        // Idle state: draw a flat center line
        self._ctx.globalAlpha = 0.3;
        self._ctx.beginPath();
        self._ctx.moveTo(0, centerY);
        self._ctx.lineTo(w, centerY);
        self._ctx.stroke();
        self._ctx.globalAlpha = 1;
        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      var bufferLength = timeDomainData.length;
      var sliceWidth = w / (bufferLength - 1);
      var sensitivityScale = sensitivity / 5;

      self._ctx.beginPath();

      for (var i = 0; i < bufferLength; i++) {
        // timeDomainData values: 0-255, 128 is center (silence)
        var sample = (timeDomainData[i] - 128) / 128; // Normalize to -1..1
        var scaledSample = sample * sensitivityScale;

        // Clamp
        if (scaledSample > 1) scaledSample = 1;
        if (scaledSample < -1) scaledSample = -1;

        var x = i * sliceWidth;
        var y = centerY + scaledSample * (h / 2);

        if (i === 0) {
          self._ctx.moveTo(x, y);
        } else {
          self._ctx.lineTo(x, y);
        }
      }

      self._ctx.stroke();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(WaveformVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
