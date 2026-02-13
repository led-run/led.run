;(function(global) {
  'use strict';

  var Candle = {
    id: 'candle',
    defaults: { color: 'ff9329', warmth: 7 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _layers: null,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var warmth = config.warmth != null ? Number(config.warmth) : this.defaults.warmth;
      warmth = Math.max(1, Math.min(10, warmth));

      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      // Flicker amplitude and jitter based on warmth
      var flickerAmp = 0.1 + warmth * 0.06;   // 0.16 to 0.7
      var jitterRange = warmth * 3;             // 3 to 30 pixels

      // 3 independent glow layers
      this._layers = [
        {
          // Primary: large, centered low, slow flicker
          r: r, g: g, b: b,
          baseX: 0.5, baseY: 0.6, radiusFrac: 0.9,
          alpha: 0.8, minAlpha: 0.8 - flickerAmp * 0.4,
          currentAlpha: 0.8, targetAlpha: 0.8,
          offsetX: 0, offsetY: 0,
          jitter: jitterRange * 0.3,
          flickerSpeed: 0.06,
          lastChange: 0, changeInterval: 80 + Math.random() * 120
        },
        {
          // Secondary: medium, slight offset, brighter, medium flicker
          r: Math.min(255, r + 30), g: Math.min(255, g + 15), b: b,
          baseX: 0.48, baseY: 0.55, radiusFrac: 0.5,
          alpha: 0.7, minAlpha: 0.7 - flickerAmp * 0.5,
          currentAlpha: 0.7, targetAlpha: 0.7,
          offsetX: 0, offsetY: 0,
          jitter: jitterRange * 0.6,
          flickerSpeed: 0.1,
          lastChange: 0, changeInterval: 60 + Math.random() * 100
        },
        {
          // Tertiary: small bright core, faster flicker, more jitter
          r: Math.min(255, r + 60), g: Math.min(255, g + 40), b: Math.min(255, b + 10),
          baseX: 0.5, baseY: 0.52, radiusFrac: 0.25,
          alpha: 0.9, minAlpha: 0.9 - flickerAmp * 0.6,
          currentAlpha: 0.9, targetAlpha: 0.9,
          offsetX: 0, offsetY: 0,
          jitter: jitterRange,
          flickerSpeed: 0.15,
          lastChange: 0, changeInterval: 40 + Math.random() * 80
        }
      ];

      // Dark warm background color
      this._bgR = Math.round(r * 0.08);
      this._bgG = Math.round(g * 0.04);
      this._bgB = Math.round(b * 0.02);

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
      var layers = self._layers;

      // Dark warm background
      ctx.fillStyle = 'rgb(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ')';
      ctx.fillRect(0, 0, w, h);

      var minDim = Math.min(w, h);

      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];

        // Update flicker target at random intervals
        if (now - layer.lastChange > layer.changeInterval) {
          layer.lastChange = now;
          layer.changeInterval = 40 + Math.random() * 120;
          layer.targetAlpha = layer.minAlpha + Math.random() * (layer.alpha - layer.minAlpha);

          // Update position jitter target
          layer.offsetX = (Math.random() - 0.5) * layer.jitter;
          layer.offsetY = (Math.random() - 0.5) * layer.jitter * 0.5;
        }

        // Smoothly interpolate alpha
        layer.currentAlpha += (layer.targetAlpha - layer.currentAlpha) * layer.flickerSpeed;

        var cx = w * layer.baseX + layer.offsetX;
        var cy = h * layer.baseY + layer.offsetY;
        var radius = minDim * layer.radiusFrac;

        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        var a = layer.currentAlpha;
        grad.addColorStop(0, 'rgba(' + layer.r + ',' + layer.g + ',' + layer.b + ',' + a.toFixed(3) + ')');
        grad.addColorStop(0.3, 'rgba(' + layer.r + ',' + layer.g + ',' + layer.b + ',' + (a * 0.6).toFixed(3) + ')');
        grad.addColorStop(0.7, 'rgba(' + layer.r + ',' + layer.g + ',' + layer.b + ',' + (a * 0.15).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + layer.r + ',' + layer.g + ',' + layer.b + ',0)');

        ctx.fillStyle = grad;
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
      this._layers = null;
    }
  };

  global.LightManager.register(Candle);
})(typeof window !== 'undefined' ? window : this);
