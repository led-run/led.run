;(function(global) {
  'use strict';

  var Rainbow = {
    id: 'rainbow',
    defaults: { speed: 3 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _startTime: 0,
    _cycleDuration: 10000,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      speed = Math.max(1, Math.min(10, speed));

      // Full cycle duration: speed 1 = 20s, speed 10 = 2s
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

      var elapsed = performance.now() - self._startTime;
      var offset = (elapsed % self._cycleDuration) / self._cycleDuration;

      // Diagonal length for full coverage
      var diag = Math.sqrt(w * w + h * h);
      // Angle ~30 degrees for diagonal flow
      var angle = Math.PI / 6;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);

      // Create gradient along the diagonal
      var grad = ctx.createLinearGradient(-diag, 0, diag, 0);

      // 24 color stops spanning the hue spectrum, repeated 2 times
      var numStops = 48;
      for (var i = 0; i <= numStops; i++) {
        var stopPos = i / numStops;
        var hue = ((stopPos * 720 + offset * 360) % 360);
        grad.addColorStop(stopPos, 'hsl(' + Math.round(hue) + ',100%,50%)');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
      ctx.restore();

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

  global.LightManager.register(Rainbow);
})(typeof window !== 'undefined' ? window : this);
