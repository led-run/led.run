;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var PlenopticVisualizer = {
    id: 'plenoptic',

    defaults: {
      color: 'ffffff',      // White
      bg: '000000',
      sensitivity: 5,
      depth: 8              // Depth layers 4-12
    },

    _canvas: null,
    _offscreenCanvas: null,
    _ctx: null,
    _offscreenCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,
    _time: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._particles = [];
      this._time = 0;

      // Offscreen canvas at 1/2 resolution
      this._offscreenCanvas = document.createElement('canvas');
      this._offscreenCtx = this._offscreenCanvas.getContext('2d');

      // Main canvas
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._initParticles();
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
      this._particles = null;
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

      this._offscreenCanvas.width = (w / 2) * dpr;
      this._offscreenCanvas.height = (h / 2) * dpr;
      this._offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._initParticles();
    },

    _initParticles: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var cfg = this._config;
      var depth = parseInt(cfg.depth, 10) || this.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > 12) depth = 12;

      this._particles = [];

      // Create particles across depth layers
      var particlesPerLayer = 40;
      for (var layer = 0; layer < depth; layer++) {
        for (var i = 0; i < particlesPerLayer; i++) {
          this._particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            depth: layer / depth, // 0 (far) to 1 (near)
            baseSize: 1 + Math.random() * 2,
            pulsePhase: Math.random() * Math.PI * 2
          });
        }
      }
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
      var particleColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var depth = parseInt(cfg.depth, 10) || self.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > 12) depth = 12;
      var ctx = self._ctx;
      var offCtx = self._offscreenCtx;

      self._time += 0.016;

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Calculate volume for particle generation
      var volume = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;
      } else {
        volume = 0.05; // Idle minimum
      }

      var normalizedVol = volume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      // Clear offscreen canvas
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, offW, offH);

      // Sort particles by depth (far to near)
      var sortedParticles = self._particles.slice().sort(function(a, b) {
        return a.depth - b.depth;
      });

      // Update and draw particles on offscreen canvas
      for (var i = 0; i < sortedParticles.length; i++) {
        var p = sortedParticles[i];

        // Update position
        p.x += p.vx * (0.5 + normalizedVol * 0.5);
        p.y += p.vy * (0.5 + normalizedVol * 0.5);

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Size based on depth (near = larger)
        var size = p.baseSize * (0.3 + p.depth * 0.7) * (1 + normalizedVol * 0.3);

        // Opacity based on depth
        var opacity = 0.2 + p.depth * 0.6;

        // Pulsing
        var pulse = 1 + Math.sin(self._time * 2 + p.pulsePhase) * 0.2;
        size *= pulse;

        // Blur radius based on depth (far = more blur, near = less blur)
        var blurRadius = (1 - p.depth) * 3;

        // Draw to offscreen with blur
        offCtx.shadowColor = 'rgba(' + particleColor.r + ',' + particleColor.g + ',' + particleColor.b + ',' + opacity + ')';
        offCtx.shadowBlur = blurRadius;
        offCtx.fillStyle = 'rgba(' + particleColor.r + ',' + particleColor.g + ',' + particleColor.b + ',' + opacity + ')';
        offCtx.beginPath();
        offCtx.arc(p.x / 2, p.y / 2, size, 0, Math.PI * 2);
        offCtx.fill();
      }

      offCtx.shadowBlur = 0;

      // Scale up to main canvas
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(self._offscreenCanvas, 0, 0, w, h);

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(PlenopticVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
