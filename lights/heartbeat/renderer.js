;(function(global) {
  'use strict';

  var Heartbeat = {
    id: 'heartbeat',
    defaults: { color: 'ff0040', bg: '100010', bpm: 72, pulse: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _r: 255,
    _g: 0,
    _b: 64,
    _bgR: 16,
    _bgG: 0,
    _bgB: 16,
    _interval: 833,
    _pulse: 5,
    _lastBeat: 0,
    _centerGlow: 0,
    _ripples: null,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var bg = config.bg || this.defaults.bg;
      var bpm = config.bpm != null ? Number(config.bpm) : this.defaults.bpm;
      var pulse = config.pulse != null ? Number(config.pulse) : this.defaults.pulse;

      bpm = Math.max(30, Math.min(200, bpm));
      pulse = Math.max(1, Math.min(10, pulse));

      this._r = parseInt(color.substring(0, 2), 16);
      this._g = parseInt(color.substring(2, 4), 16);
      this._b = parseInt(color.substring(4, 6), 16);
      this._bgR = parseInt(bg.substring(0, 2), 16);
      this._bgG = parseInt(bg.substring(2, 4), 16);
      this._bgB = parseInt(bg.substring(4, 6), 16);

      this._interval = 60000 / bpm;
      this._pulse = pulse;
      this._lastBeat = performance.now();
      this._centerGlow = 1.0;
      this._ripples = [];

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

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var now = performance.now();

      var r = self._r;
      var g = self._g;
      var b = self._b;

      // Check for new beat
      var timeSinceBeat = now - self._lastBeat;
      if (timeSinceBeat >= self._interval) {
        self._lastBeat = now;
        timeSinceBeat = 0;

        // Flash center glow
        self._centerGlow = 1.0;

        // Spawn new ripple ring
        self._ripples.push({
          birth: now,
          radius: 0,
          alpha: 0.8
        });
      }

      // Decay center glow between beats
      // Quick attack, slow decay: use exponential decay
      var beatProgress = timeSinceBeat / self._interval;
      self._centerGlow = Math.max(0, Math.pow(1 - beatProgress, 2.5));

      // Fill background
      ctx.fillStyle = 'rgb(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ')';
      ctx.fillRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2;
      var maxDim = Math.max(w, h);
      var pulseIntensity = self._pulse / 10; // 0.1 to 1.0

      // Draw ripple rings (oldest first so newer ones render on top)
      var ripples = self._ripples;
      var i = ripples.length;
      while (i--) {
        var ripple = ripples[i];
        var age = now - ripple.birth;
        var lifespan = self._interval * 2.5; // ripples last ~2.5 beats

        if (age > lifespan) {
          ripples.splice(i, 1);
          continue;
        }

        var progress = age / lifespan;
        var rippleRadius = maxDim * 0.6 * progress;
        var rippleAlpha = (1 - progress) * 0.6 * pulseIntensity;

        if (rippleAlpha <= 0) continue;

        // Draw ring
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + rippleAlpha.toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, 3 * (1 - progress));
        ctx.stroke();

        // Soft glow around ring
        var ringGlowWidth = 20 * (1 - progress * 0.5);
        var innerR = Math.max(0, rippleRadius - ringGlowWidth);
        var outerR = rippleRadius + ringGlowWidth;
        var ringGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        var glowAlpha = rippleAlpha * 0.3;
        ringGrad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        ringGrad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + glowAlpha.toFixed(3) + ')');
        ringGrad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + (glowAlpha * 1.5).toFixed(3) + ')');
        ringGrad.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',' + glowAlpha.toFixed(3) + ')');
        ringGrad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');

        ctx.fillStyle = ringGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Draw center glow
      var glowRadius = maxDim * 0.35 * (0.5 + self._centerGlow * 0.5);
      var centerAlpha = self._centerGlow * pulseIntensity;

      if (centerAlpha > 0.01) {
        var cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        // Bright core
        var coreR = Math.min(255, r + 80);
        var coreG = Math.min(255, g + 80);
        var coreB = Math.min(255, b + 80);
        cGrad.addColorStop(0, 'rgba(' + coreR + ',' + coreG + ',' + coreB + ',' + (centerAlpha * 0.9).toFixed(3) + ')');
        cGrad.addColorStop(0.15, 'rgba(' + r + ',' + g + ',' + b + ',' + (centerAlpha * 0.7).toFixed(3) + ')');
        cGrad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + (centerAlpha * 0.25).toFixed(3) + ')');
        cGrad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');

        ctx.fillStyle = cGrad;
        ctx.fillRect(0, 0, w, h);
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
      this._ripples = null;
    }
  };

  global.LightManager.register(Heartbeat);
})(typeof window !== 'undefined' ? window : this);
