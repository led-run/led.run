;(function(global) {
  'use strict';

  var Gradient = {
    id: 'gradient',
    defaults: { colors: 'ff0000,ff8800,ffff00,00ff00,0088ff,8800ff', speed: 3 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _startTime: 0,
    _cycleDuration: 10000,
    _colorList: null,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var colorsStr = config.colors || this.defaults.colors;
      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      speed = Math.max(1, Math.min(10, speed));

      // Parse colors
      this._colorList = colorsStr.split(',').map(function(c) {
        return '#' + c.trim();
      });
      if (this._colorList.length < 2) {
        this._colorList.push('#000000');
      }
      // Append first color for seamless loop
      this._colorList.push(this._colorList[0]);

      // Cycle duration: speed 1 = 20s, speed 10 = 2s
      this._cycleDuration = (22 - speed * 2) * 1000;

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
      var colors = self._colorList;
      var numColors = colors.length;

      var elapsed = performance.now() - self._startTime;
      var offset = (elapsed % self._cycleDuration) / self._cycleDuration;

      // Draw gradient wider than canvas (2x width) and shift it
      var gradW = w * 2;
      var shiftX = -offset * w;

      var grad = ctx.createLinearGradient(shiftX, 0, shiftX + gradW, 0);

      // Distribute color stops evenly across the gradient width
      for (var i = 0; i < numColors; i++) {
        grad.addColorStop(i / (numColors - 1), colors[i]);
      }

      ctx.fillStyle = grad;
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
      this._colorList = null;
    }
  };

  global.LightManager.register(Gradient);
})(typeof window !== 'undefined' ? window : this);
