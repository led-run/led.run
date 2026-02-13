;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var AmbienceVisualizer = {
    id: 'ambience',

    defaults: {
      color: '4080ff',      // Blue ambient
      bg: '000000',
      sensitivity: 5,
      glowRadius: 0.6,      // 0.3-1.0
      ambPreset: 'glow'     // glow, water, swirl
    },

    _canvas: null,
    _offscreenCanvas: null,
    _ctx: null,
    _offscreenCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _time: 0,
    _avgVolume: 0,
    _hueShift: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._time = 0;
      this._avgVolume = 0;
      this._hueShift = 0;

      // Main canvas
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Offscreen canvas at 1/2 resolution for performance
      this._offscreenCanvas = document.createElement('canvas');
      this._offscreenCtx = this._offscreenCanvas.getContext('2d');

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
      this._offscreenCanvas = null;
      this._offscreenCtx = null;
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

      // Offscreen at half resolution
      this._offscreenCanvas.width = (w / 2) * dpr;
      this._offscreenCanvas.height = (h / 2) * dpr;
      this._offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var offW = w / 2;
      var offH = h / 2;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var glowColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var glowRadius = parseFloat(cfg.glowRadius) || self.defaults.glowRadius;
      if (glowRadius < 0.3) glowRadius = 0.3;
      if (glowRadius > 1) glowRadius = 1;
      var ctx = self._ctx;
      var offCtx = self._offscreenCtx;

      self._time += 0.016;

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Calculate average volume
      var volume = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;
      } else {
        volume = 0.1; // Idle state minimum
      }

      // Smooth volume
      self._avgVolume = self._avgVolume * 0.9 + volume * 0.1;

      var normalizedVol = self._avgVolume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      // Preset selection
      var preset = cfg.ambPreset || self.defaults.ambPreset;

      // Slow hue shift
      self._hueShift += 0.1;
      if (self._hueShift > 360) self._hueShift -= 360;

      // Calculate shifted color
      var hueShiftAmount = Math.sin(self._hueShift * Math.PI / 180) * 30;
      var r = Math.max(0, Math.min(255, glowColor.r + hueShiftAmount));
      var g = Math.max(0, Math.min(255, glowColor.g + hueShiftAmount * 0.5));
      var b = Math.max(0, Math.min(255, glowColor.b - hueShiftAmount * 0.5));

      // Clear offscreen canvas
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, offW, offH);

      var centerX = offW / 2;
      var centerY = offH / 2;

      // Breathing effect
      var breathe = 0.7 + Math.sin(self._time * 1.5) * 0.3;
      var radiusMultiplier = breathe + normalizedVol * 0.5;

      var maxRadius = Math.max(offW, offH) * glowRadius * radiusMultiplier;

      // Multi-layer radial gradients for soft glow with shadowBlur
      var layers = 5;
      for (var i = 0; i < layers; i++) {
        var layerRadius = maxRadius * (1 - i / layers);
        var layerAlpha = (0.3 - i * 0.05) * (0.5 + normalizedVol * 0.5);

        // Add glow effect with shadowBlur
        offCtx.shadowBlur = 15 + normalizedVol * 10;
        offCtx.shadowColor = 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',0.6)';

        var grad = offCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius);
        grad.addColorStop(0, 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',' + layerAlpha + ')');
        grad.addColorStop(0.5, 'rgba(' + Math.floor(r * 0.8) + ',' + Math.floor(g * 0.8) + ',' + Math.floor(b * 0.8) + ',' + (layerAlpha * 0.5) + ')');
        grad.addColorStop(1, 'rgba(' + Math.floor(r * 0.5) + ',' + Math.floor(g * 0.5) + ',' + Math.floor(b * 0.5) + ',0)');

        offCtx.fillStyle = grad;

        // Preset-specific rendering
        if (preset === 'water') {
          // Water: flowing outward from center
          var waveOffset = Math.sin(self._time * 2 + i * 0.5) * 20;
          offCtx.save();
          offCtx.translate(Math.cos(self._time + i) * waveOffset, Math.sin(self._time + i) * waveOffset);
          offCtx.fillRect(-offW, -offH, offW * 3, offH * 3);
          offCtx.restore();
        } else if (preset === 'swirl') {
          // Swirl: rotating spiral
          offCtx.save();
          offCtx.translate(centerX, centerY);
          offCtx.rotate(self._time * 0.3 + i * 0.2);
          offCtx.translate(-centerX, -centerY);
          offCtx.fillRect(0, 0, offW, offH);
          offCtx.restore();
        } else {
          // Default glow: static centered
          offCtx.fillRect(0, 0, offW, offH);
        }
      }
      offCtx.shadowBlur = 0;

      // Scale up offscreen canvas to main canvas (simple upscale creates blur effect)
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(self._offscreenCanvas, 0, 0, w, h);

      // Flash white on music peaks
      if (normalizedVol > 0.75) {
        var flashAlpha = (normalizedVol - 0.75) * 4; // 0-1 range
        if (flashAlpha > 1) flashAlpha = 1;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (flashAlpha * 0.3) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      // Optional: add subtle particle sparkles
      if (normalizedVol > 0.3) {
        ctx.shadowColor = 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',0.8)';
        ctx.shadowBlur = 10;

        var sparkleCount = Math.floor(normalizedVol * 20);
        for (var i = 0; i < sparkleCount; i++) {
          var angle = Math.random() * Math.PI * 2;
          var distance = Math.random() * maxRadius * 2;
          var x = w / 2 + Math.cos(angle) * distance;
          var y = h / 2 + Math.sin(angle) * distance;
          var size = 1 + Math.random() * 2;
          var alpha = 0.2 + Math.random() * 0.3;

          ctx.fillStyle = 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',' + alpha + ')';
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(AmbienceVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
