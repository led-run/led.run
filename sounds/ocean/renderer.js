;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var OceanVisualizer = {
    id: 'ocean',

    defaults: {
      color: '4080ff',      // Ocean blue
      bg: '001a33',         // Deep sea blue
      sensitivity: 5,
      waveCount: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _time: 0,
    _smoothedAmps: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._time = 0;
      this._smoothedAmps = null;

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
      this._smoothedAmps = null;
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
      var waveCount = parseInt(cfg.waveCount, 10) || self.defaults.waveCount;
      if (waveCount < 3) waveCount = 3;
      if (waveCount > 10) waveCount = 10;
      var ctx = self._ctx;

      self._time += 0.016; // ~16ms per frame

      // Clear with background gradient (darker at top, lighter at bottom)
      var bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')');
      var lightBgR = Math.min(255, bgColor.r + 20);
      var lightBgG = Math.min(255, bgColor.g + 30);
      var lightBgB = Math.min(255, bgColor.b + 40);
      bgGrad.addColorStop(1, 'rgb(' + lightBgR + ',' + lightBgG + ',' + lightBgB + ')');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Initialize smoothed amplitudes
      if (!self._smoothedAmps || self._smoothedAmps.length !== waveCount) {
        self._smoothedAmps = new Float32Array(waveCount);
        for (var i = 0; i < waveCount; i++) {
          self._smoothedAmps[i] = 0;
        }
      }

      // Calculate amplitude for each wave layer from different frequency bands
      var amplitudes = [];
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        var binStep = Math.floor(binCount / waveCount);
        for (var i = 0; i < waveCount; i++) {
          var start = i * binStep;
          var end = Math.min(start + binStep, binCount);
          var sum = 0;
          for (var j = start; j < end; j++) {
            sum += freqData[j];
          }
          var avg = sum / (end - start);
          // Apply smoothing
          self._smoothedAmps[i] = self._smoothedAmps[i] * 0.85 + avg * 0.15;
          var normalized = (self._smoothedAmps[i] / 255) * (sensitivity / 5);
          amplitudes.push(normalized);
        }
      } else {
        // Idle state: very subtle waves
        for (var i = 0; i < waveCount; i++) {
          amplitudes.push(0.05);
        }
      }

      // Draw waves from back to front (lower frequency = background, higher = foreground)
      for (var layer = 0; layer < waveCount; layer++) {
        var depth = (layer + 1) / waveCount; // 0.2 to 1.0
        var baseY = h * (0.3 + layer * 0.12); // Stagger vertically
        var amp = amplitudes[layer] * h * 0.2;
        if (amp < 5) amp = 5; // Minimum amplitude

        var waveSpeed = 0.3 + layer * 0.1;
        var frequency = 0.005 - layer * 0.0005;

        // Color transitions from dark to light as layers go forward
        var layerR = Math.floor(waveColor.r * (0.3 + depth * 0.7));
        var layerG = Math.floor(waveColor.g * (0.3 + depth * 0.7));
        var layerB = Math.floor(waveColor.b * (0.3 + depth * 0.7));

        // Enable subtle glow for foreground waves
        if (layer >= waveCount - 2) {
          ctx.shadowColor = 'rgba(' + layerR + ',' + layerG + ',' + layerB + ',0.6)';
          ctx.shadowBlur = 15;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = 'rgba(' + layerR + ',' + layerG + ',' + layerB + ',' + (0.3 + depth * 0.4) + ')';

        // Draw wave using quadratic curves
        ctx.beginPath();
        ctx.moveTo(-10, h);

        var points = 100;
        for (var i = 0; i <= points; i++) {
          var x = (w / points) * i;
          var y = baseY + Math.sin((x * frequency) + (self._time * waveSpeed) + layer) * amp;
          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            var prevX = (w / points) * (i - 1);
            var prevY = baseY + Math.sin((prevX * frequency) + (self._time * waveSpeed) + layer) * amp;
            var cpX = (prevX + x) / 2;
            var cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        }

        ctx.lineTo(w + 10, h);
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(OceanVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
