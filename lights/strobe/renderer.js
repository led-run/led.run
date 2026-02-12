;(function(global) {
  'use strict';

  var Strobe = {
    id: 'strobe',
    defaults: { color: 'ffffff', speed: 5, bg: '000000' },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _startTime: 0,
    _halfPeriod: 0,
    _r: 255,
    _g: 255,
    _b: 255,
    _bgR: 0,
    _bgG: 0,
    _bgB: 0,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var bg = config.bg || this.defaults.bg;
      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      speed = Math.max(1, Math.min(20, speed));

      this._r = parseInt(color.substring(0, 2), 16);
      this._g = parseInt(color.substring(2, 4), 16);
      this._b = parseInt(color.substring(4, 6), 16);
      this._bgR = parseInt(bg.substring(0, 2), 16);
      this._bgG = parseInt(bg.substring(2, 4), 16);
      this._bgB = parseInt(bg.substring(4, 6), 16);

      // Half period: time for on or off phase
      this._halfPeriod = 1000 / speed / 2;

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

      var elapsed = performance.now() - self._startTime;
      var fullPeriod = self._halfPeriod * 2;
      var pos = elapsed % fullPeriod;
      var isOn = pos < self._halfPeriod;

      if (isOn) {
        // "On" phase: radial bloom glow
        var cx = w / 2;
        var cy = h / 2;
        var radius = Math.sqrt(cx * cx + cy * cy);

        // Brighter center, normal color at edges
        var r = self._r;
        var g = self._g;
        var b = self._b;
        var brightR = Math.min(255, r + Math.round((255 - r) * 0.5));
        var brightG = Math.min(255, g + Math.round((255 - g) * 0.5));
        var brightB = Math.min(255, b + Math.round((255 - b) * 0.5));

        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, 'rgb(' + brightR + ',' + brightG + ',' + brightB + ')');
        grad.addColorStop(0.4, 'rgb(' + r + ',' + g + ',' + b + ')');
        grad.addColorStop(1, 'rgb(' + r + ',' + g + ',' + b + ')');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        // "Off" phase: rapid afterglow decay
        var offProgress = (pos - self._halfPeriod) / self._halfPeriod;

        // Background
        ctx.fillStyle = 'rgb(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ')';
        ctx.fillRect(0, 0, w, h);

        // Brief afterglow at start of off phase (first ~20% of off time)
        if (offProgress < 0.2) {
          var glowAlpha = (1 - offProgress / 0.2) * 0.3;
          ctx.fillStyle = 'rgba(' + self._r + ',' + self._g + ',' + self._b + ',' + glowAlpha.toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
        }
      }

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
    }
  };

  global.LightManager.register(Strobe);
})(typeof window !== 'undefined' ? window : this);
