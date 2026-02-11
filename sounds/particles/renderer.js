;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var ParticlesVisualizer = {
    id: 'particles',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      count: 200
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._particles = [];

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      // Pre-populate some particles
      var maxCount = parseInt(config.count, 10) || this.defaults.count;
      var w = container.clientWidth;
      var h = container.clientHeight;
      for (var i = 0; i < Math.floor(maxCount / 2); i++) {
        this._particles.push(this._createParticle(w, h, true));
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
      this._particles = null;
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

    _createParticle: function(w, h, randomY) {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1.5,  // Horizontal drift
        vy: -(Math.random() * 1.5 + 0.5),  // Upward velocity
        size: Math.random() * 3 + 1,
        life: 1.0,                          // 1.0 = full, 0.0 = dead
        decay: Math.random() * 0.005 + 0.003
      };
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var particleColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var maxCount = parseInt(cfg.count, 10) || self.defaults.count;

      // Clear with background
      self._ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      self._ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var avgAmplitude = 0;

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      if (freqData && freqData.length > 0) {
        // Calculate average amplitude
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        avgAmplitude = sum / freqData.length / 255; // 0-1
      }

      var sensitivityScale = sensitivity / 5;
      var scaledAmplitude = avgAmplitude * sensitivityScale;
      if (scaledAmplitude > 1) scaledAmplitude = 1;

      // Spawn rate: more particles when louder
      var spawnRate = isRunning ? Math.floor(1 + scaledAmplitude * 5) : 1;

      // Spawn new particles if under limit
      for (var s = 0; s < spawnRate; s++) {
        if (self._particles.length < maxCount) {
          self._particles.push(self._createParticle(w, h, false));
        }
      }

      // Update and draw particles
      var aliveParticles = [];

      for (var i = 0; i < self._particles.length; i++) {
        var p = self._particles[i];

        // Audio drives speed: base speed + amplitude boost
        var speedMultiplier = 1 + scaledAmplitude * 3;
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        // Fade based on vertical position (fade as approaching top)
        var positionFade = p.y / h;
        if (positionFade < 0) positionFade = 0;

        p.life -= p.decay * speedMultiplier;

        if (p.life <= 0 || p.y < -10) {
          continue; // Remove dead particles
        }

        // Size affected by amplitude
        var drawSize = p.size * (1 + scaledAmplitude * 2);
        var alpha = p.life * positionFade;
        if (alpha < 0) alpha = 0;
        if (alpha > 1) alpha = 1;

        self._ctx.fillStyle = 'rgba(' + particleColor.r + ',' + particleColor.g + ',' + particleColor.b + ',' + alpha.toFixed(3) + ')';
        self._ctx.beginPath();
        self._ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
        self._ctx.fill();

        aliveParticles.push(p);
      }

      self._particles = aliveParticles;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ParticlesVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
