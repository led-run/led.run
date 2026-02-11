;(function(global) {
  'use strict';

  var Candle = {
    id: 'candle',
    defaults: { color: 'ff9329', warmth: 7 },

    _container: null,
    _rafId: null,
    _innerEl: null,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var warmth = config.warmth != null ? Number(config.warmth) : this.defaults.warmth;

      // Clamp warmth to 1-10
      warmth = Math.max(1, Math.min(10, warmth));

      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      // Flicker range: warmth controls how much brightness varies
      // warmth 1 = minimal flicker (0.85-1.0), warmth 10 = dramatic flicker (0.3-1.0)
      var minBrightness = 1.0 - (warmth * 0.07);
      var flickerRange = 1.0 - minBrightness;

      // Create inner glow element for radial effect
      var inner = document.createElement('div');
      inner.style.position = 'absolute';
      inner.style.top = '0';
      inner.style.left = '0';
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.background = 'radial-gradient(ellipse at 50% 60%, rgba(' + r + ',' + g + ',' + b + ',1) 0%, rgba(' + r + ',' + g + ',' + b + ',0.6) 50%, rgba(' + Math.round(r * 0.3) + ',' + Math.round(g * 0.2) + ',' + Math.round(b * 0.1) + ',0.9) 100%)';
      this._innerEl = inner;

      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.background = '#000000';
      container.appendChild(inner);

      var self = this;
      var currentBrightness = 1.0;
      var targetBrightness = 1.0;
      var lastFlickerTime = 0;

      function animate(now) {
        // Change target brightness at random intervals
        if (now - lastFlickerTime > 50 + Math.random() * 150) {
          lastFlickerTime = now;
          targetBrightness = minBrightness + Math.random() * flickerRange;
        }

        // Smoothly interpolate towards target
        currentBrightness += (targetBrightness - currentBrightness) * 0.15;
        inner.style.opacity = currentBrightness.toFixed(3);

        self._rafId = requestAnimationFrame(animate);
      }

      this._rafId = requestAnimationFrame(animate);
    },

    destroy: function() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._innerEl && this._innerEl.parentNode) {
        this._innerEl.parentNode.removeChild(this._innerEl);
      }
      this._innerEl = null;
      if (this._container) {
        this._container.style.position = '';
        this._container.style.overflow = '';
        this._container.style.background = '';
        this._container = null;
      }
    }
  };

  global.LightManager.register(Candle);
})(typeof window !== 'undefined' ? window : this);
