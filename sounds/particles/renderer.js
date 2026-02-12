;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  // Convert RGB to HSL, returns [h(0-360), s(0-1), l(0-1)]
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      h *= 360;
    }
    return [h, s, l];
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
    _baseHsl: null,
    _isBlackBg: true,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._particles = [];

      var pColor = hexToRgb(config.color || this.defaults.color);
      this._baseHsl = rgbToHsl(pColor.r, pColor.g, pColor.b);

      var bgColor = hexToRgb(config.bg || this.defaults.bg);
      this._isBlackBg = (bgColor.r + bgColor.g + bgColor.b) < 30;

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
      this._baseHsl = null;
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
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(Math.random() * 1.5 + 0.5),
        size: Math.random() * 3 + 1,
        life: 1.0,
        maxLife: 1.0,
        decay: Math.random() * 0.005 + 0.003,
        hueShift: 0  // accumulated hue shift as particle ages
      };
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var maxCount = parseInt(cfg.count, 10) || self.defaults.count;
      var ctx = self._ctx;
      var baseHsl = self._baseHsl;

      if (self._isBlackBg) {
        // Trail effect: semi-transparent background overlay
        ctx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.15)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Non-black bg: full clear to avoid alpha accumulation
        ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
        ctx.fillRect(0, 0, w, h);
      }

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var avgAmplitude = 0;

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

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

      // Spawn rate: more particles when louder
      var spawnRate = isRunning ? Math.floor(1 + scaledAmplitude * 5) : 1;

      for (var s = 0; s < spawnRate; s++) {
        if (self._particles.length < maxCount) {
          self._particles.push(self._createParticle(w, h, false));
        }
      }

      // Enable glow
      ctx.shadowBlur = 6;

      var aliveParticles = [];

      for (var i = 0; i < self._particles.length; i++) {
        var p = self._particles[i];

        var speedMultiplier = 1 + scaledAmplitude * 3;
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        var positionFade = p.y / h;
        if (positionFade < 0) positionFade = 0;

        p.life -= p.decay * speedMultiplier;

        if (p.life <= 0 || p.y < -10) {
          continue;
        }

        // Hue shift as particle ages: shift by up to 60 degrees over lifetime
        var ageFraction = 1 - (p.life / p.maxLife);
        p.hueShift = ageFraction * 60;

        var drawSize = p.size * (1 + scaledAmplitude * 2);
        var alpha = p.life * positionFade;
        if (alpha < 0) alpha = 0;
        if (alpha > 1) alpha = 1;

        // Color with hue shift
        var hue = (baseHsl[0] + p.hueShift) % 360;
        var sat = Math.round(baseHsl[1] * 100);
        var lit = Math.round(baseHsl[2] * 100);

        var colorStr = 'hsla(' + Math.round(hue) + ',' + sat + '%,' + lit + '%,' + alpha.toFixed(3) + ')';
        ctx.shadowColor = 'hsl(' + Math.round(hue) + ',' + sat + '%,' + lit + '%)';

        ctx.fillStyle = colorStr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
        ctx.fill();

        aliveParticles.push(p);
      }

      ctx.shadowBlur = 0;

      self._particles = aliveParticles;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ParticlesVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
