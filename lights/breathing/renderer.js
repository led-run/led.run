;(function(global) {
  'use strict';

  var Breathing = {
    id: 'breathing',
    defaults: { color: '4488ff', bg: '001122', cycle: 8, depth: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _startTime: 0,
    _r: 0,
    _g: 0,
    _b: 0,
    _bgR: 0,
    _bgG: 0,
    _bgB: 0,
    _cycleDuration: 8000,
    _depth: 5,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var bg = config.bg || this.defaults.bg;
      var cycle = config.cycle != null ? Number(config.cycle) : this.defaults.cycle;
      var depth = config.depth != null ? Number(config.depth) : this.defaults.depth;

      cycle = Math.max(4, Math.min(20, cycle));
      depth = Math.max(1, Math.min(10, depth));

      this._r = parseInt(color.substring(0, 2), 16);
      this._g = parseInt(color.substring(2, 4), 16);
      this._b = parseInt(color.substring(4, 6), 16);
      this._bgR = parseInt(bg.substring(0, 2), 16);
      this._bgG = parseInt(bg.substring(2, 4), 16);
      this._bgB = parseInt(bg.substring(4, 6), 16);

      this._cycleDuration = cycle * 1000;
      this._depth = depth;

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

      var elapsed = now - self._startTime;
      var phase = (elapsed % self._cycleDuration) / self._cycleDuration;

      // Sine wave for smooth breathing: 0 → 1 → 0
      // Use a modified sine for inhale (slower expand) and exhale (faster contract)
      var breathAngle = phase * Math.PI * 2;
      var breathValue = (Math.sin(breathAngle - Math.PI / 2) + 1) / 2; // 0 to 1

      // Depth controls how much alpha/radius varies
      // depth 1 = subtle (0.5-1.0), depth 10 = dramatic (0.05-1.0)
      var minAlpha = Math.max(0.05, 0.55 - self._depth * 0.05);
      var alpha = minAlpha + (1.0 - minAlpha) * breathValue;

      // Radius also breathes: expands on inhale, contracts on exhale
      var minRadiusFrac = 0.3;
      var maxRadiusFrac = 1.2;
      var radiusFrac = minRadiusFrac + (maxRadiusFrac - minRadiusFrac) * breathValue;

      // Fill background
      ctx.fillStyle = 'rgb(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ')';
      ctx.fillRect(0, 0, w, h);

      // Draw centered radial gradient pulse
      var cx = w / 2;
      var cy = h / 2;
      var maxRadius = Math.max(w, h) * 0.7;
      var radius = maxRadius * radiusFrac;

      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      var r = self._r;
      var g = self._g;
      var b = self._b;

      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')');
      grad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.7).toFixed(3) + ')');
      grad.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.3).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Secondary soft glow layer for richness
      var innerRadius = radius * 0.4;
      var innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
      // Brighter core
      var coreR = Math.min(255, r + 60);
      var coreG = Math.min(255, g + 60);
      var coreB = Math.min(255, b + 60);
      var coreAlpha = alpha * 0.5;

      innerGrad.addColorStop(0, 'rgba(' + coreR + ',' + coreG + ',' + coreB + ',' + coreAlpha.toFixed(3) + ')');
      innerGrad.addColorStop(0.5, 'rgba(' + coreR + ',' + coreG + ',' + coreB + ',' + (coreAlpha * 0.4).toFixed(3) + ')');
      innerGrad.addColorStop(1, 'rgba(' + coreR + ',' + coreG + ',' + coreB + ',0)');

      ctx.fillStyle = innerGrad;
      ctx.fillRect(0, 0, w, h);

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

  global.LightManager.register(Breathing);
})(typeof window !== 'undefined' ? window : this);
