;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var TunnelVisualizer = {
    id: 'tunnel',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      shape: 'circle'
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _rings: null,
    _lastTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._rings = [];
      this._lastTime = performance.now();

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      // Seed initial rings at various stages of expansion
      for (var i = 0; i < 12; i++) {
        this._rings.push({
          radius: i * 0.08,
          opacity: 1.0 - i * 0.07,
          birth: performance.now() - i * 300
        });
      }

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
      this._rings = null;
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
      var ctx = self._ctx;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var ringColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var shape = cfg.shape || self.defaults.shape;

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000;
      self._lastTime = now;
      if (dt > 0.1) dt = 0.1; // cap delta for tab switches

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Compute average amplitude
      var avgAmplitude = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        avgAmplitude = sum / freqData.length / 255;
      }

      var sensitivityScale = sensitivity / 5;
      var scaledAmplitude = avgAmplitude * sensitivityScale;
      if (scaledAmplitude > 1) scaledAmplitude = 1;

      // Expansion speed: base speed + audio modulation
      var baseSpeed = 0.15; // idle speed (normalized radius per second)
      var audioSpeed = isRunning ? scaledAmplitude * 0.8 : 0;
      var expansionSpeed = baseSpeed + audioSpeed;

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2;
      var maxDim = Math.max(w, h) * 0.85;

      // Spawn new ring periodically
      var spawnInterval = isRunning ? Math.max(0.08, 0.25 - scaledAmplitude * 0.17) : 0.35;
      if (self._rings.length === 0 || (self._rings.length > 0 && self._rings[self._rings.length - 1].radius > spawnInterval * expansionSpeed * 2)) {
        self._rings.push({
          radius: 0.0,
          opacity: 1.0,
          birth: now
        });
      }

      // Update and draw rings (back to front: large rings first for proper layering)
      var aliveRings = [];

      for (var i = 0; i < self._rings.length; i++) {
        var ring = self._rings[i];

        // Expand with perspective acceleration: rings accelerate as they grow
        var perspectiveFactor = 1 + ring.radius * 2;
        ring.radius += expansionSpeed * dt * perspectiveFactor;

        // Fade opacity: start visible, fade as they reach the edge
        ring.opacity = 1.0 - ring.radius;
        if (ring.opacity < 0) ring.opacity = 0;

        // Cull rings that have expanded beyond view
        if (ring.radius > 1.2) {
          continue;
        }

        aliveRings.push(ring);
      }

      self._rings = aliveRings;

      // Sort: draw farthest (smallest) first, nearest (largest) last
      aliveRings.sort(function(a, b) { return a.radius - b.radius; });

      for (var i = 0; i < aliveRings.length; i++) {
        var ring = aliveRings[i];

        // Perspective size: exponential growth
        var perspectiveRadius = ring.radius * ring.radius * maxDim;

        // Color brightness decreases for older (larger) rings
        var brightness = ring.opacity;
        if (!isRunning) brightness *= 0.3; // dim in idle

        var alpha = brightness * 0.8;
        if (alpha < 0.01) continue;

        // Stroke width: thicker as ring grows closer
        var lineWidth = 1 + ring.radius * 3;

        ctx.strokeStyle = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = lineWidth;

        // Subtle glow for closer rings
        if (ring.radius > 0.3) {
          ctx.shadowColor = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',' + (alpha * 0.5).toFixed(3) + ')';
          ctx.shadowBlur = 4 + ring.radius * 10;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();

        if (shape === 'square') {
          var halfSize = perspectiveRadius;
          ctx.rect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2);
        } else {
          // circle (default)
          ctx.arc(cx, cy, perspectiveRadius, 0, Math.PI * 2);
        }

        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw bright center point
      var centerBrightness = isRunning ? 0.3 + scaledAmplitude * 0.7 : 0.15;
      var centerGlow = 10 + (isRunning ? scaledAmplitude * 20 : 0);

      ctx.shadowColor = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',' + centerBrightness.toFixed(3) + ')';
      ctx.shadowBlur = centerGlow;
      ctx.fillStyle = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',' + centerBrightness.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(TunnelVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
