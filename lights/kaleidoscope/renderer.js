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

  var Kaleidoscope = {
    id: 'kaleidoscope',
    defaults: { speed: 4, symmetry: 8, complexity: 5, colors: 'ff0066,00ffcc,ffcc00,6644ff' },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _colorList: null,
    _speed: 4,
    _symmetry: 8,
    _complexity: 5,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;
      this._startTime = performance.now();

      var colorsStr = config.colors || this.defaults.colors;
      this._colorList = parseHexColors(colorsStr);
      if (this._colorList.length === 0) {
        this._colorList = [[255, 0, 102]];
      }

      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._symmetry = config.symmetry != null ? Number(config.symmetry) : this.defaults.symmetry;
      this._symmetry = Math.max(4, Math.min(16, Math.round(this._symmetry)));

      this._complexity = config.complexity != null ? Number(config.complexity) : this.defaults.complexity;
      this._complexity = Math.max(1, Math.min(10, this._complexity));

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
      var sym = self._symmetry;
      var complexity = self._complexity;
      var colors = self._colorList;

      var cx = w / 2;
      var cy = h / 2;
      var radius = Math.min(w, h) * 0.48;

      // Dark background
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Rotation angle
      var rotation = t * speedFactor * 0.3;
      var angleStep = (Math.PI * 2) / sym;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Draw shapes in each symmetry segment
      for (var s = 0; s < sym; s++) {
        ctx.save();
        ctx.rotate(s * angleStep);

        // Clip to segment wedge
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 1.2, 0);
        ctx.arc(0, 0, radius * 1.2, 0, angleStep);
        ctx.closePath();
        ctx.clip();

        // Draw source pattern shapes based on complexity
        var shapeCount = Math.round(2 + complexity * 1.5);
        for (var i = 0; i < shapeCount; i++) {
          var ci = i % colors.length;
          var c = colors[ci];

          // Animated position within the segment
          var phase = t * speedFactor * 0.5 + i * 1.7;
          var dist = radius * (0.15 + 0.35 * Math.abs(Math.sin(phase * 0.4 + i)));
          var angle = angleStep * 0.5 * Math.sin(phase * 0.3 + i * 0.9);
          var sx = Math.cos(angle) * dist;
          var sy = Math.sin(angle) * dist;

          var shapeSize = radius * (0.05 + 0.12 * Math.abs(Math.sin(phase * 0.6 + i * 1.3)));
          var alpha = 0.3 + 0.4 * Math.abs(Math.sin(phase * 0.5 + i));

          // Alternate between circles and lines
          if (i % 3 === 0) {
            // Circle
            ctx.beginPath();
            ctx.arc(sx, sy, shapeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
            ctx.fill();
          } else if (i % 3 === 1) {
            // Line
            var lx = sx + Math.cos(phase) * shapeSize * 2;
            var ly = sy + Math.sin(phase) * shapeSize * 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(lx, ly);
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1.5 + complexity * 0.3;
            ctx.stroke();
          } else {
            // Triangle
            ctx.beginPath();
            for (var v = 0; v < 3; v++) {
              var va = phase + v * (Math.PI * 2 / 3);
              var vx = sx + Math.cos(va) * shapeSize;
              var vy = sy + Math.sin(va) * shapeSize;
              if (v === 0) ctx.moveTo(vx, vy);
              else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha * 0.6).toFixed(3) + ')';
            ctx.fill();
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      ctx.restore();

      // Subtle center glow
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.3);
      glow.addColorStop(0, 'rgba(255,255,255,0.06)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
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

  global.LightManager.register(Kaleidoscope);
})(typeof window !== 'undefined' ? window : this);
