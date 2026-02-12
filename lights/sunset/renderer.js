;(function(global) {
  'use strict';

  var Sunset = {
    id: 'sunset',
    defaults: { speed: 2, sunSize: 5, cloudDensity: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _startTime: 0,
    _speed: 2,
    _sunSize: 5,
    _clouds: null,

    init: function(container, config) {
      this._container = container;

      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._sunSize = config.sunSize != null ? Number(config.sunSize) : this.defaults.sunSize;
      this._sunSize = Math.max(1, Math.min(10, this._sunSize));

      var cloudDensity = config.cloudDensity != null ? Number(config.cloudDensity) : this.defaults.cloudDensity;
      cloudDensity = Math.max(3, Math.min(10, cloudDensity));

      // Initialize cloud silhouettes
      this._clouds = [];
      for (var i = 0; i < cloudDensity; i++) {
        this._clouds.push({
          x: Math.random(),                          // normalized x position (0-1)
          y: 0.08 + Math.random() * 0.45,            // normalized y position (upper half)
          w: 0.08 + Math.random() * 0.14,            // normalized width
          h: 0.02 + Math.random() * 0.03,            // normalized height
          speed: 0.2 + Math.random() * 0.8,          // relative speed factor
          opacity: 0.15 + Math.random() * 0.35       // silhouette opacity
        });
      }

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._startTime = performance.now();
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

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var now = performance.now();
      var elapsed = (now - self._startTime) / 1000;

      // --- Sky gradient (bottom orange-red to top deep purple) ---
      var skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#1a0533');     // deep purple at top
      skyGrad.addColorStop(0.3, '#4a1942');   // dark magenta
      skyGrad.addColorStop(0.55, '#b83250');  // warm crimson
      skyGrad.addColorStop(0.75, '#e8652b');  // deep orange
      skyGrad.addColorStop(0.9, '#f5a623');   // golden orange
      skyGrad.addColorStop(1.0, '#f7c948');   // bright yellow-orange at horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // --- Sun ---
      var sunRadius = (w * 0.03) + (w * 0.03) * (self._sunSize / 10);
      var sunX = w * 0.5;
      var sunY = h * 0.72;

      // Sun glow (outer soft halo)
      var glowRadius = sunRadius * 3.5;
      var glowGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, glowRadius);
      glowGrad.addColorStop(0, 'rgba(255, 200, 80, 0.6)');
      glowGrad.addColorStop(0.3, 'rgba(255, 160, 50, 0.3)');
      glowGrad.addColorStop(0.6, 'rgba(255, 100, 30, 0.1)');
      glowGrad.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun disc
      var sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
      sunGrad.addColorStop(0, '#fff8e0');
      sunGrad.addColorStop(0.4, '#ffe066');
      sunGrad.addColorStop(0.8, '#ff9933');
      sunGrad.addColorStop(1, '#ff6622');
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // --- Clouds ---
      var baseSpeed = self._speed * 0.008;
      var clouds = self._clouds;

      for (var i = 0; i < clouds.length; i++) {
        var cloud = clouds[i];

        // Drift horizontally
        cloud.x += baseSpeed * cloud.speed * (1 / 60);

        // Wrap around
        if (cloud.x > 1.0 + cloud.w) {
          cloud.x = -cloud.w;
        }

        var cx = cloud.x * w;
        var cy = cloud.y * h;
        var cw = cloud.w * w;
        var ch = cloud.h * h;

        // Draw cloud as a cluster of overlapping ellipses for organic shape
        ctx.fillStyle = 'rgba(30, 10, 40, ' + cloud.opacity.toFixed(2) + ')';
        ctx.beginPath();

        // Main body
        ctx.ellipse(cx, cy, cw * 0.5, ch, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left bump
        ctx.beginPath();
        ctx.ellipse(cx - cw * 0.28, cy - ch * 0.15, cw * 0.32, ch * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right bump
        ctx.beginPath();
        ctx.ellipse(cx + cw * 0.25, cy - ch * 0.1, cw * 0.35, ch * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top bump
        ctx.beginPath();
        ctx.ellipse(cx + cw * 0.05, cy - ch * 0.5, cw * 0.25, ch * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Horizon haze ---
      var hazeGrad = ctx.createLinearGradient(0, h * 0.82, 0, h);
      hazeGrad.addColorStop(0, 'rgba(255, 180, 80, 0)');
      hazeGrad.addColorStop(0.5, 'rgba(255, 160, 60, 0.15)');
      hazeGrad.addColorStop(1, 'rgba(255, 140, 40, 0.25)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);

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
      this._clouds = null;
    }
  };

  global.LightManager.register(Sunset);
})(typeof window !== 'undefined' ? window : this);
