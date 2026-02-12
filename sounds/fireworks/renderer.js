;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

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

  var FireworksVisualizer = {
    id: 'fireworks',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      trails: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _rockets: null,
    _explosions: null,
    _sparkles: null,
    _lastTime: 0,
    _cooldowns: null,
    _idleTimer: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._rockets = [];
      this._explosions = [];
      this._sparkles = [];
      this._lastTime = performance.now();
      this._cooldowns = { bass: 0, mid: 0, treble: 0 };
      this._idleTimer = 0;

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
      this._rockets = null;
      this._explosions = null;
      this._sparkles = null;
      this._cooldowns = null;
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

    _launchRocket: function(w, h, size, hue) {
      this._rockets.push({
        x: w * 0.15 + Math.random() * w * 0.7,
        y: h,
        targetY: h * 0.1 + Math.random() * h * 0.35,
        vy: -(h * 0.8 + Math.random() * h * 0.4) / 60, // velocity per frame (~60fps)
        size: size,
        hue: hue,
        trail: [],
        alive: true
      });
    },

    _explode: function(x, y, size, hue, trails) {
      var particleCount = 30 + Math.floor(size * 20);
      var explosion = {
        particles: [],
        time: 0,
        maxTime: 1.5 + trails * 0.15
      };

      for (var i = 0; i < particleCount; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = (0.5 + Math.random() * 2) * (1 + size * 0.5);
        var pHue = (hue + (Math.random() - 0.5) * 60 + 360) % 360;

        explosion.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed * 60, // velocity per second
          vy: Math.sin(angle) * speed * 60,
          hue: pHue,
          size: 1 + Math.random() * 2 * size,
          life: 1.0,
          decay: 0.3 + Math.random() * 0.4,
          trail: []
        });
      }

      this._explosions.push(explosion);
    },

    _addIdleSparkle: function(w, h, baseHsl) {
      this._sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.5 + Math.random() * 1.5,
        life: 1.0,
        decay: 0.5 + Math.random() * 1.0,
        hue: (baseHsl[0] + Math.random() * 60 - 30 + 360) % 360,
        sat: Math.round(baseHsl[1] * 100),
        lit: Math.round(baseHsl[2] * 100)
      });
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var trails = parseInt(cfg.trails, 10) || self.defaults.trails;
      if (trails < 1) trails = 1;
      if (trails > 10) trails = 10;

      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000;
      self._lastTime = now;
      if (dt > 0.1) dt = 0.1;

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Trail effect: semi-transparent background for motion blur
      var trailAlpha = 0.08 + (10 - trails) * 0.025;
      ctx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',' + trailAlpha.toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);

      // Analyze frequency bands
      var bassAvg = 0, midAvg = 0, trebleAvg = 0;
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        var bassEnd = Math.floor(binCount * 0.1);
        var midEnd = Math.floor(binCount * 0.4);
        var sum, count;

        // Bass band
        sum = 0; count = 0;
        for (var i = 0; i < bassEnd; i++) { sum += freqData[i]; count++; }
        bassAvg = count > 0 ? sum / count / 255 : 0;

        // Mid band
        sum = 0; count = 0;
        for (var i = bassEnd; i < midEnd; i++) { sum += freqData[i]; count++; }
        midAvg = count > 0 ? sum / count / 255 : 0;

        // Treble band
        sum = 0; count = 0;
        for (var i = midEnd; i < binCount; i++) { sum += freqData[i]; count++; }
        trebleAvg = count > 0 ? sum / count / 255 : 0;
      }

      var sensitivityScale = sensitivity / 5;
      bassAvg *= sensitivityScale;
      midAvg *= sensitivityScale;
      trebleAvg *= sensitivityScale;

      // Update cooldowns
      self._cooldowns.bass = Math.max(0, self._cooldowns.bass - dt);
      self._cooldowns.mid = Math.max(0, self._cooldowns.mid - dt);
      self._cooldowns.treble = Math.max(0, self._cooldowns.treble - dt);

      // Launch fireworks based on audio bands
      var bassThreshold = 0.5;
      var midThreshold = 0.45;
      var trebleThreshold = 0.4;

      if (isRunning) {
        if (bassAvg > bassThreshold && self._cooldowns.bass <= 0) {
          self._launchRocket(w, h, 1.5, baseHsl[0]);
          self._cooldowns.bass = 0.3;
        }
        if (midAvg > midThreshold && self._cooldowns.mid <= 0) {
          self._launchRocket(w, h, 1.0, (baseHsl[0] + 60) % 360);
          self._cooldowns.mid = 0.25;
        }
        if (trebleAvg > trebleThreshold && self._cooldowns.treble <= 0) {
          self._launchRocket(w, h, 0.6, (baseHsl[0] + 180) % 360);
          self._cooldowns.treble = 0.2;
        }
      } else {
        // Idle: occasional dim sparkle
        self._idleTimer += dt;
        if (self._idleTimer > 0.3) {
          self._idleTimer = 0;
          if (Math.random() < 0.3) {
            self._addIdleSparkle(w, h, baseHsl);
          }
        }
      }

      // Update and draw idle sparkles
      var aliveSparkles = [];
      for (var i = 0; i < self._sparkles.length; i++) {
        var sp = self._sparkles[i];
        sp.life -= sp.decay * dt;
        if (sp.life <= 0) continue;

        var alpha = sp.life * 0.3;
        ctx.shadowColor = 'hsla(' + Math.round(sp.hue) + ',' + sp.sat + '%,' + sp.lit + '%,' + alpha.toFixed(3) + ')';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'hsla(' + Math.round(sp.hue) + ',' + sp.sat + '%,' + sp.lit + '%,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();

        aliveSparkles.push(sp);
      }
      self._sparkles = aliveSparkles;

      // Update and draw rockets
      var aliveRockets = [];
      var gravity = h * 0.5; // gravity in pixels per second^2

      for (var i = 0; i < self._rockets.length; i++) {
        var rocket = self._rockets[i];
        if (!rocket.alive) continue;

        rocket.y += rocket.vy;

        // Store trail point
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 8) rocket.trail.shift();

        // Check if reached target
        if (rocket.y <= rocket.targetY) {
          // Explode
          self._explode(rocket.x, rocket.y, rocket.size, rocket.hue, trails);
          rocket.alive = false;
          continue;
        }

        // Draw rocket trail
        var sat = Math.round(baseHsl[1] * 100);
        var lit = Math.round(baseHsl[2] * 100);
        for (var j = 0; j < rocket.trail.length; j++) {
          var tp = rocket.trail[j];
          var tAlpha = (j + 1) / rocket.trail.length * 0.8;
          var tSize = 1 + (j / rocket.trail.length) * 1.5;
          ctx.fillStyle = 'hsla(' + Math.round(rocket.hue) + ',' + sat + '%,' + lit + '%,' + tAlpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, tSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw rocket head
        ctx.shadowColor = 'hsl(' + Math.round(rocket.hue) + ',' + sat + '%,' + lit + '%)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'hsl(' + Math.round(rocket.hue) + ',' + sat + '%,' + Math.min(90, lit + 20) + '%)';
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 2, 0, Math.PI * 2);
        ctx.fill();

        aliveRockets.push(rocket);
      }
      self._rockets = aliveRockets;

      // Update and draw explosions
      var aliveExplosions = [];

      for (var i = 0; i < self._explosions.length; i++) {
        var exp = self._explosions[i];
        exp.time += dt;

        if (exp.time > exp.maxTime) continue;

        var hasAlive = false;

        for (var j = 0; j < exp.particles.length; j++) {
          var p = exp.particles[j];
          if (p.life <= 0) continue;

          // Physics
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += gravity * dt; // gravity
          p.vx *= 0.99; // air resistance
          p.vy *= 0.99;

          p.life -= p.decay * dt;
          if (p.life < 0) p.life = 0;

          if (p.life <= 0) continue;
          hasAlive = true;

          var alpha = p.life * 0.9;
          var pSat = Math.round(baseHsl[1] * 100);
          var pLit = Math.min(80, Math.round(baseHsl[2] * 100) + 20);

          ctx.shadowColor = 'hsla(' + Math.round(p.hue) + ',' + pSat + '%,' + pLit + '%,' + (alpha * 0.5).toFixed(3) + ')';
          ctx.shadowBlur = p.size * 3;
          ctx.fillStyle = 'hsla(' + Math.round(p.hue) + ',' + pSat + '%,' + pLit + '%,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }

        if (hasAlive) {
          aliveExplosions.push(exp);
        }
      }
      self._explosions = aliveExplosions;

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(FireworksVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
