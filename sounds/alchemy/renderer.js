;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var AlchemyVisualizer = {
    id: 'alchemy',

    defaults: {
      color: 'ff6600',      // Orange energy
      bg: '000000',
      sensitivity: 5,
      complexity: 5         // Particle density 1-10
    },

    _canvas: null,
    _trailCanvas: null,
    _ctx: null,
    _trailCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,
    _time: 0,
    _avgVolume: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._time = 0;
      this._avgVolume = 0;

      // Trail canvas for particle trails
      this._trailCanvas = document.createElement('canvas');
      this._trailCanvas.style.position = 'absolute';
      this._trailCanvas.style.top = '0';
      this._trailCanvas.style.left = '0';
      this._trailCanvas.style.width = '100%';
      this._trailCanvas.style.height = '100%';
      container.appendChild(this._trailCanvas);
      this._trailCtx = this._trailCanvas.getContext('2d');

      // Main canvas for orb and particles
      this._canvas = document.createElement('canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.top = '0';
      this._canvas.style.left = '0';
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
      if (this._trailCanvas && this._trailCanvas.parentNode) {
        this._trailCanvas.parentNode.removeChild(this._trailCanvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._trailCanvas = null;
      this._trailCtx = null;
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

      this._trailCanvas.width = w * dpr;
      this._trailCanvas.height = h * dpr;
      this._trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._initParticles();
    },

    _initParticles: function() {
      var cfg = this._config;
      var complexity = parseInt(cfg.complexity, 10) || this.defaults.complexity;
      if (complexity < 1) complexity = 1;
      if (complexity > 10) complexity = 10;

      var count = complexity * 30; // 30-300 particles
      this._particles = [];

      for (var i = 0; i < count; i++) {
        this._particles.push({
          angle: Math.random() * Math.PI * 2,
          radius: 50 + Math.random() * 200,
          speed: 0.01 + Math.random() * 0.02,
          spiralSpeed: 0.5 + Math.random() * 0.5,
          size: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.5
        });
      }
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var orbColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var ctx = self._ctx;
      var trailCtx = self._trailCtx;

      self._time += 0.016;

      // Clear main canvas
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Fade trail canvas
      trailCtx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.1)';
      trailCtx.fillRect(0, 0, w, h);

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
      self._avgVolume = self._avgVolume * 0.85 + volume * 0.15;

      var normalizedVol = self._avgVolume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      var centerX = w / 2;
      var centerY = h / 2;

      // Draw central energy orb
      var orbRadius = 30 + normalizedVol * 100;

      // Hue shift based on volume (orange to yellow to white)
      var hueShift = normalizedVol * 60; // 0-60 degree shift
      var r = orbColor.r;
      var g = Math.min(255, orbColor.g + hueShift);
      var b = orbColor.b;

      // Radial gradient for orb
      var orbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      orbGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.8 + normalizedVol * 0.2) + ')');
      orbGrad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');
      orbGrad.addColorStop(0.7, 'rgba(' + Math.floor(r * 0.6) + ',' + Math.floor(g * 0.6) + ',' + Math.floor(b * 0.6) + ',0.5)');
      orbGrad.addColorStop(1, 'rgba(' + Math.floor(r * 0.3) + ',' + Math.floor(g * 0.3) + ',' + Math.floor(b * 0.3) + ',0)');

      ctx.shadowColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.shadowBlur = 30 + normalizedVol * 20;
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Update and draw particles
      trailCtx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.8)';
      trailCtx.shadowBlur = 8;

      for (var i = 0; i < self._particles.length; i++) {
        var p = self._particles[i];

        // Logarithmic spiral motion
        p.angle += p.speed * (1 + normalizedVol);
        p.radius += p.spiralSpeed * (0.5 + normalizedVol * 0.5);

        // Reset particle if it goes too far
        if (p.radius > Math.max(w, h) * 0.7) {
          p.radius = 50 + Math.random() * 50;
          p.angle = Math.random() * Math.PI * 2;
        }

        var x = centerX + Math.cos(p.angle) * p.radius;
        var y = centerY + Math.sin(p.angle) * p.radius;

        // Draw particle on trail canvas
        var particleAlpha = p.opacity * (1 - p.radius / (Math.max(w, h) * 0.7));
        trailCtx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + particleAlpha + ')';
        trailCtx.beginPath();
        trailCtx.arc(x, y, p.size, 0, Math.PI * 2);
        trailCtx.fill();
      }

      trailCtx.shadowBlur = 0;

      // Draw pulsing rings around orb
      var ringCount = 3;
      for (var i = 0; i < ringCount; i++) {
        var phase = (self._time * 2 + i * (Math.PI * 2 / ringCount)) % (Math.PI * 2);
        var ringRadius = orbRadius + 20 + Math.sin(phase) * 30;
        var ringAlpha = (0.3 + Math.sin(phase) * 0.2) * normalizedVol;

        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + ringAlpha + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(AlchemyVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
