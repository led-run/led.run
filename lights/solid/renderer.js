;(function(global) {
  'use strict';

  var Solid = {
    id: 'solid',
    defaults: { color: 'ffffff', brightness: 100 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _boundResize: null,
    _r: 255,
    _g: 255,
    _b: 255,
    _brightness: 100,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      this._brightness = config.brightness != null ? Number(config.brightness) : this.defaults.brightness;
      this._brightness = Math.max(0, Math.min(100, this._brightness));

      this._r = parseInt(color.substring(0, 2), 16);
      this._g = parseInt(color.substring(2, 4), 16);
      this._b = parseInt(color.substring(4, 6), 16);

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._render();
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._render();
    },

    _render: function() {
      if (!this._ctx || !this._container) return;

      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;
      var alpha = this._brightness / 100;
      var r = this._r;
      var g = this._g;
      var b = this._b;

      // Slightly darker edge color for radial falloff
      var edgeR = Math.round(r * 0.7);
      var edgeG = Math.round(g * 0.7);
      var edgeB = Math.round(b * 0.7);

      var cx = w / 2;
      var cy = h / 2;
      var radius = Math.sqrt(cx * cx + cy * cy);

      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
      grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
      grad.addColorStop(1, 'rgba(' + edgeR + ',' + edgeG + ',' + edgeB + ',' + alpha + ')');

      // Black base for alpha compositing
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },

    destroy: function() {
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

  global.LightManager.register(Solid);
})(typeof window !== 'undefined' ? window : this);
