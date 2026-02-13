;(function(global) {
  'use strict';

  var Plasma = {
    id: 'plasma',
    defaults: { speed: 5, waveScale: 5, intensity: 7 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _offCanvas: null,
    _offCtx: null,
    _offW: 0,
    _offH: 0,
    _speed: 5,
    _waveScale: 5,
    _intensity: 7,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;
      this._startTime = performance.now();

      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._waveScale = config.waveScale != null ? Number(config.waveScale) : this.defaults.waveScale;
      this._waveScale = Math.max(1, Math.min(10, this._waveScale));

      this._intensity = config.intensity != null ? Number(config.intensity) : this.defaults.intensity;
      this._intensity = Math.max(1, Math.min(10, this._intensity));

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Offscreen buffer at 1/4 resolution
      this._offCanvas = document.createElement('canvas');
      this._offCtx = this._offCanvas.getContext('2d');

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

      // Update offscreen buffer (1/4 resolution, no DPR scaling)
      this._offW = Math.max(1, Math.floor(w / 4));
      this._offH = Math.max(1, Math.floor(h / 4));
      this._offCanvas.width = this._offW;
      this._offCanvas.height = this._offH;
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var offCtx = self._offCtx;
      var offW = self._offW;
      var offH = self._offH;
      var t = (performance.now() - self._startTime) / 1000;
      var speedFactor = self._speed / 5;
      var freq = self._waveScale * 0.015;
      var saturation = 50 + self._intensity * 5; // 55-100%
      var lightness = 35 + self._intensity * 2;  // 37-55%

      var time = t * speedFactor;

      // Draw plasma on small offscreen buffer
      var imageData = offCtx.createImageData(offW, offH);
      var data = imageData.data;

      for (var y = 0; y < offH; y++) {
        for (var x = 0; x < offW; x++) {
          var px = x * 4; // map back to approximate display coords
          var py = y * 4;

          // Classic plasma formula: sum of 4 sine functions
          var v = Math.sin(px * freq + time);
          v += Math.sin(py * freq + time * 0.7);
          v += Math.sin((px + py) * freq * 0.7 + time * 0.5);
          v += Math.sin(Math.sqrt(px * px + py * py) * freq * 0.5 + time * 0.8);

          // Map v (-4..4) to hue (0..360), cycling over time
          var hue = ((v + 4) / 8 * 360 + time * 30) % 360;

          // HSL to RGB conversion
          var s = saturation / 100;
          var l = lightness / 100;
          var c2 = (1 - Math.abs(2 * l - 1)) * s;
          var hh = hue / 60;
          var x2 = c2 * (1 - Math.abs(hh % 2 - 1));
          var r1 = 0, g1 = 0, b1 = 0;

          if (hh < 1) { r1 = c2; g1 = x2; }
          else if (hh < 2) { r1 = x2; g1 = c2; }
          else if (hh < 3) { g1 = c2; b1 = x2; }
          else if (hh < 4) { g1 = x2; b1 = c2; }
          else if (hh < 5) { r1 = x2; b1 = c2; }
          else { r1 = c2; b1 = x2; }

          var m = l - c2 / 2;
          var idx = (y * offW + x) * 4;
          data[idx] = Math.round((r1 + m) * 255);
          data[idx + 1] = Math.round((g1 + m) * 255);
          data[idx + 2] = Math.round((b1 + m) * 255);
          data[idx + 3] = 255;
        }
      }

      offCtx.putImageData(imageData, 0, 0);

      // Scale up: draw small buffer onto main canvas
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(self._offCanvas, 0, 0, w, h);

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
      this._offCanvas = null;
      this._offCtx = null;
    }
  };

  global.LightManager.register(Plasma);
})(typeof window !== 'undefined' ? window : this);
