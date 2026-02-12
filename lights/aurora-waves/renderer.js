;(function(global) {
  'use strict';

  function parseHexColors(str) {
    return str.split(',').map(function(c) {
      c = c.trim();
      return [
        parseInt(c.substring(0, 2), 16),
        parseInt(c.substring(2, 4), 16),
        parseInt(c.substring(4, 6), 16)
      ];
    });
  }

  var AuroraWaves = {
    id: 'aurora-waves',
    defaults: { speed: 3, waves: 6, amplitude: 5, colors: '00ff88,ff66cc,8844ff' },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _colorList: null,
    _speed: 3,
    _waveCount: 6,
    _amplitude: 5,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;
      this._startTime = performance.now();

      var colorsStr = config.colors || this.defaults.colors;
      this._colorList = parseHexColors(colorsStr);
      if (this._colorList.length === 0) {
        this._colorList = [[0, 255, 136]];
      }

      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._waveCount = config.waves != null ? Number(config.waves) : this.defaults.waves;
      this._waveCount = Math.max(3, Math.min(12, this._waveCount));

      this._amplitude = config.amplitude != null ? Number(config.amplitude) : this.defaults.amplitude;
      this._amplitude = Math.max(1, Math.min(10, this._amplitude));

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
      var t = (performance.now() - self._startTime) / 1000;
      var speedFactor = self._speed / 5;
      var ampFactor = self._amplitude / 5;
      var colors = self._colorList;
      var waveCount = self._waveCount;

      // Dark navy background derived from colors
      var bgR = Math.round(colors[0][0] * 0.03);
      var bgG = Math.round(colors[0][1] * 0.03);
      var bgB = Math.round(colors[0][2] * 0.05 + 15);
      ctx.fillStyle = 'rgb(' + bgR + ',' + bgG + ',' + bgB + ')';
      ctx.fillRect(0, 0, w, h);

      // Draw each wave band
      for (var i = 0; i < waveCount; i++) {
        var colorIdx = i % colors.length;
        var c = colors[colorIdx];

        // Each wave has slightly different frequency and phase
        var freq = 0.003 + i * 0.0008;
        var phase = i * 1.2 + t * speedFactor * (0.5 + i * 0.15);
        var verticalDrift = t * speedFactor * 8 + i * 30;

        // Base vertical position: waves spread across canvas, drifting upward
        var baseY = h * (0.3 + (i / waveCount) * 0.5) - (verticalDrift % (h * 1.5)) + h * 0.5;
        // Wrap around
        baseY = ((baseY % (h * 1.2)) + h * 1.2) % (h * 1.2) - h * 0.1;

        var waveHeight = h * 0.08 * ampFactor;
        var alpha = 0.12 + 0.06 * Math.sin(t * 0.5 + i);

        ctx.beginPath();
        ctx.moveTo(0, h);

        // Bottom edge of wave
        for (var x = 0; x <= w; x += 4) {
          var y = baseY + Math.sin(x * freq + phase) * waveHeight * 0.8
                        + Math.sin(x * freq * 1.7 + phase * 0.6) * waveHeight * 0.4;
          if (x === 0) {
            ctx.lineTo(0, y + waveHeight);
          } else {
            ctx.lineTo(x, y + waveHeight);
          }
        }

        // Top edge of wave (reverse)
        for (var x2 = w; x2 >= 0; x2 -= 4) {
          var y2 = baseY + Math.sin(x2 * freq + phase) * waveHeight
                         + Math.sin(x2 * freq * 1.7 + phase * 0.6) * waveHeight * 0.5;
          ctx.lineTo(x2, y2 - waveHeight * 0.3);
        }

        ctx.closePath();

        // Color with hue shift over time
        var hueShift = Math.sin(t * 0.3 + i * 0.5) * 30;
        var r = Math.max(0, Math.min(255, c[0] + hueShift));
        var g = Math.max(0, Math.min(255, c[1] + hueShift * 0.5));
        var b = Math.max(0, Math.min(255, c[2] - hueShift * 0.3));

        ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + alpha.toFixed(3) + ')';
        ctx.fill();
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
      this._colorList = null;
    }
  };

  global.LightManager.register(AuroraWaves);
})(typeof window !== 'undefined' ? window : this);
