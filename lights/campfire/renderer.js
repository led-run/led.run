;(function(global) {
  'use strict';

  var PARTICLE_TYPES = {
    flame: 0,
    spark: 1,
    smoke: 2
  };

  var Campfire = {
    id: 'campfire',
    defaults: { sparks: 5, wind: 3 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _particles: null,
    _sparks: 5,
    _wind: 3,
    _lastTime: 0,

    init: function(container, config) {
      this._container = container;
      this._particles = [];
      this._lastTime = performance.now();

      this._sparks = config.sparks != null ? Number(config.sparks) : this.defaults.sparks;
      this._sparks = Math.max(0, Math.min(10, this._sparks));

      this._wind = config.wind != null ? Number(config.wind) : this.defaults.wind;
      this._wind = Math.max(0, Math.min(10, this._wind));

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._animate();
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

    _spawnFlame: function(w, h) {
      return {
        type: PARTICLE_TYPES.flame,
        x: w * 0.5 + (Math.random() - 0.5) * w * 0.15,
        y: h * 0.85 + Math.random() * h * 0.1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(1.5 + Math.random() * 2.5),
        size: 8 + Math.random() * 20,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.012,
        // Orange to yellow range
        r: 255,
        g: Math.round(100 + Math.random() * 120),
        b: 0
      };
    },

    _spawnSpark: function(w, h) {
      return {
        type: PARTICLE_TYPES.spark,
        x: w * 0.5 + (Math.random() - 0.5) * w * 0.1,
        y: h * 0.82 + Math.random() * h * 0.05,
        vx: (Math.random() - 0.5) * 3,
        vy: -(3 + Math.random() * 4),
        size: 1.5 + Math.random() * 2.5,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        // Bright yellow/white
        r: 255,
        g: Math.round(220 + Math.random() * 35),
        b: Math.round(150 + Math.random() * 105)
      };
    },

    _spawnSmoke: function(w, h) {
      return {
        type: PARTICLE_TYPES.smoke,
        x: w * 0.5 + (Math.random() - 0.5) * w * 0.08,
        y: h * 0.7 + Math.random() * h * 0.05,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.3 + Math.random() * 0.5),
        size: 20 + Math.random() * 30,
        life: 1.0,
        decay: 0.003 + Math.random() * 0.004,
        // Gray
        r: 120,
        g: 110,
        b: 100
      };
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var now = performance.now();
      var dt = Math.min((now - self._lastTime) / 16.67, 3); // normalize to ~60fps, cap
      self._lastTime = now;
      var particles = self._particles;
      var windForce = (self._wind / 10) * 0.3;

      // Warm dark background
      ctx.fillStyle = 'rgb(25,8,5)';
      ctx.fillRect(0, 0, w, h);

      // Ambient fire glow at the base
      var glowGrad = ctx.createRadialGradient(
        w * 0.5, h * 0.85, 0,
        w * 0.5, h * 0.85, Math.min(w, h) * 0.5
      );
      glowGrad.addColorStop(0, 'rgba(255,100,20,0.15)');
      glowGrad.addColorStop(0.4, 'rgba(255,60,10,0.06)');
      glowGrad.addColorStop(1, 'rgba(255,30,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Spawn flame particles (roughly 4-8 per frame)
      var flameCount = 4 + Math.round(Math.random() * 4);
      for (var f = 0; f < flameCount; f++) {
        particles.push(self._spawnFlame(w, h));
      }

      // Spawn sparks
      var sparkCount = Math.round(self._sparks * (0.3 + Math.random() * 0.7));
      for (var s = 0; s < sparkCount; s++) {
        particles.push(self._spawnSpark(w, h));
      }

      // Spawn smoke (1-2 per frame)
      if (Math.random() < 0.4) {
        particles.push(self._spawnSmoke(w, h));
      }

      // Update and draw particles
      var alive = [];
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // Apply wind
        p.vx += windForce * dt;

        // Update position
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;

        if (p.life <= 0) continue;

        // Grow smoke over time
        if (p.type === PARTICLE_TYPES.smoke) {
          p.size += 0.3 * dt;
        }
        // Shrink flames slightly
        if (p.type === PARTICLE_TYPES.flame) {
          p.size *= (1 - 0.005 * dt);
        }

        // Draw
        var alpha;
        if (p.type === PARTICLE_TYPES.smoke) {
          alpha = p.life * 0.08;
        } else if (p.type === PARTICLE_TYPES.spark) {
          alpha = p.life * 0.9;
        } else {
          alpha = p.life * 0.6;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha.toFixed(3) + ')';
        ctx.fill();

        // Glow for sparks
        if (p.type === PARTICLE_TYPES.spark && p.life > 0.3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,200,100,' + (alpha * 0.15).toFixed(3) + ')';
          ctx.fill();
        }

        alive.push(p);
      }

      self._particles = alive;

      self._rafId = requestAnimationFrame(function() { self._animate(); });
    },

    destroy: function() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
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
      this._particles = null;
    }
  };

  global.LightManager.register(Campfire);
})(typeof window !== 'undefined' ? window : this);
