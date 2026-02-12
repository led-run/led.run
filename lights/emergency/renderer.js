;(function(global) {
  'use strict';

  var Emergency = {
    id: 'emergency',
    defaults: { speed: 2 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _startTime: 0,
    _phaseDuration: 0,
    _flashDuration: 40,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      speed = Math.max(1, Math.min(10, speed));

      // Cap effective flash rate at ≤3Hz for photosensitivity safety
      // Each full cycle = red glow + flash + blue glow + flash = 4 phases
      // At 3Hz max: minimum cycle = ~333ms, so min phase = ~83ms
      var rawPhase = Math.round(500 / speed);
      this._phaseDuration = Math.max(83, rawPhase);
      this._flashDuration = Math.min(40, this._phaseDuration * 0.15);

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
      var cycleLen = self._phaseDuration * 4;
      var cyclePos = elapsed % cycleLen;

      // 4-phase cycle:
      // Phase 0: Red glow left side
      // Phase 1: Brief white flash
      // Phase 2: Blue glow right side
      // Phase 3: Brief white flash
      var phase = Math.floor(cyclePos / self._phaseDuration);
      var phaseProgress = (cyclePos % self._phaseDuration) / self._phaseDuration;

      // Black background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      if (phase === 0) {
        // Red glow on left half
        self._drawGlow(ctx, w, h, w * 0.25, h * 0.5, Math.max(w, h) * 0.8, 255, 0, 0, 0.9);
      } else if (phase === 2) {
        // Blue glow on right half
        self._drawGlow(ctx, w, h, w * 0.75, h * 0.5, Math.max(w, h) * 0.8, 0, 40, 255, 0.9);
      } else {
        // White flash phases (1 and 3)
        // Quick fade: bright at start, fades to black
        var flashAlpha = Math.max(0, 1 - phaseProgress * 2.5);
        if (flashAlpha > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha.toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
        }
      }

      self._rafId = requestAnimationFrame(function() { self._animate(); });
    },

    _drawGlow: function(ctx, w, h, cx, cy, radius, r, g, b, alpha) {
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
      grad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.7) + ')');
      grad.addColorStop(0.7, 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.2) + ')');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
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

  global.LightManager.register(Emergency);
})(typeof window !== 'undefined' ? window : this);
